import { Request, Response } from "express";
import MeetingModel from "../models/meeting";
import WorkspaceModel from "../models/workspace";
import TeamModel from "../models/team";
import { ApiError } from "../utils/ApiError";
import {
  sendMeetingScheduledEmail,
  scheduleMeetingReminderEmail,
  sendMeetingCancellationEmail,
  sendMeetingRescheduleEmail
} from "../middlewares/email";


export const scheduleMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized user");

    const { workspaceId } = req.params;
    const { title, description, startTime, endTime, teamId, isConference } = req.body;

    if (!title || !startTime || !endTime) {
      throw new ApiError(400, "Missing required meeting details");
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, "Invalid date format for startTime or endTime");
    }

    if (start <= now) {
      throw new ApiError(400, "Meeting start time must be in the future");
    }

    if (end <= start) {
      throw new ApiError(400, "End time must be after start time");
    }

    const userId = String(user._id);

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const isManager =
      workspace.manager &&
      workspace.manager.toString() === userId;

    const supervisorTeam = await TeamModel.findOne({ workspaceId, superviser: userId });
    const isSupervisor = !!supervisorTeam;

    if (!isManager && !isSupervisor) {
      throw new ApiError(403, "Only manager or supervisor can schedule meetings");
    }

    let meetingAttendees: string[] = [];

    if (isManager) {
      if (isConference) {
        const workspaceWithMembers = await WorkspaceModel.findById(workspaceId).populate(
          "members",
          "email"
        );
        meetingAttendees = workspaceWithMembers?.members.map((m: any) => m.email) || [];
      } else if (teamId) {
        const team = await TeamModel.findById(teamId).populate("members", "email");
        if (!team) throw new ApiError(404, "Team not found");
        meetingAttendees = team.members.map((m: any) => m.email);
      } else {
        throw new ApiError(400, "Specify teamId or set isConference = true");
      }
    } else if (isSupervisor) {
      const team = await TeamModel.findOne({
        workspaceId,
        superviser: userId,
      }).populate("members", "email");

      if (!team) throw new ApiError(404, "Team not found");
      meetingAttendees = team.members.map((m: any) => m.email);
    }

    const meeting = await MeetingModel.create({
      title,
      description,
      startTime: start,
      endTime: end,
      attendees: meetingAttendees,
      workspace: workspaceId,
      createdBy: userId,
    });

    await sendMeetingScheduledEmail(
      meetingAttendees,
      title,
      description,
      start,
      end,
      user.fullName || "Manager"
    );

    scheduleMeetingReminderEmail(meetingAttendees, title, startTime);

    res.status(201).json({
      success: true,
      message: "Meeting scheduled successfully",
      meeting,
    });
  } catch (err: any) {
    console.error("Error scheduling meeting:", err);
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const getWorkspaceMeetings = async (req: Request, res: Response): Promise<void> => {
  try {

    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const userId = String(user._id);

    const workspaces = await WorkspaceModel.find({
      $or: [
        { manager: userId },
        { members: userId },
      ],
    }).select("_id workspaceName");

    const supervisedTeams = await TeamModel.find({ superviser: userId }).select("workspaceId");
    const supervisedWorkspaceIds = supervisedTeams.map((t) => String(t.workspaceId));

    const allWorkspaceIds = [
      ...new Set([
        ...workspaces.map((w) => String(w._id)),
        ...supervisedWorkspaceIds,
      ]),
    ];

    if (allWorkspaceIds.length === 0) {
      res.status(200).json({
        success: true,
        message: "No meetings found. User is not part of any workspace.",
        count: 0,
        meetings: [],
      });
      return;
    }

    const meetings = await MeetingModel.find({
      workspace: { $in: allWorkspaceIds },
    })
      .sort({ startTime: -1 })
      .populate("createdBy", "fullName email")
      .populate("workspace", "workspaceName");

    res.status(200).json({
      success: true,
      message: "Fetched all meetings from joined workspaces",
      count: meetings.length,
      meetings,
    });
  } catch (err: any) {
    console.error("Error fetching meetings:", err);
    res
      .status(err.statusCode || 500)
      .json({
        success: false,
        message: err.message || "Server error while fetching meetings",
      });
  }
};

export const deleteMeeting = async (req: Request, res: Response): Promise<void> => {
  try {

    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { meetingId } = req.params;
    const userId = String(user._id);

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting) throw new ApiError(404, "Meeting not found");

    const workspace = await WorkspaceModel.findById(meeting.workspace);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const isManager =
      workspace.manager && workspace.manager.toString() === userId;

    const supervisorTeam = await TeamModel.findOne({
      workspaceId: workspace._id,
      superviser: userId,
    });
    const isSupervisor = !!supervisorTeam;

    const isCreator = meeting.createdBy.toString() === userId;

    if (!isCreator && !isManager && !isSupervisor) {
      throw new ApiError(403, "Not authorized to delete this meeting");
    }

    await meeting.deleteOne();

    await sendMeetingCancellationEmail(
      meeting.attendees,
      meeting.title,
      meeting.startTime,
      workspace.workspaceName
    );

    res.status(200).json({
      success: true,
      message: "Meeting deleted successfully.",
    });
  } catch (err: any) {
    console.error("Error deleting meeting:", err);
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};


export const updateMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { meetingId } = req.params;
    const { startTime, endTime, title, description } = req.body;
    const userId = String(user._id);

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting) throw new ApiError(404, "Meeting not found");

    const workspace = await WorkspaceModel.findById(meeting.workspace);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const isManager =
      workspace.manager && workspace.manager.toString() === userId;

    const supervisorTeam = await TeamModel.findOne({
      workspaceId: workspace._id,
      superviser: userId,
    });
    const isSupervisor = !!supervisorTeam;

    const isCreator = meeting.createdBy.toString() === userId;
    if (!isCreator && !isManager && !isSupervisor) {
      throw new ApiError(403, "Not authorized to update this meeting");
    }

    const oldStart = meeting.startTime;
    const oldEnd = meeting.endTime;

    if (startTime) {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) throw new ApiError(400, "Invalid start time format");
      if (start <= new Date()) throw new ApiError(400, "Start time must be in the future");
      meeting.startTime = start;
    }

    if (endTime) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) throw new ApiError(400, "Invalid end time format");
      if (meeting.startTime && end <= meeting.startTime)
        throw new ApiError(400, "End time must be after start time");
      meeting.endTime = end;
    }

    if (title) meeting.title = title;
    if (description) meeting.description = description;

    await meeting.save();

    const timingChanged =
      (startTime && new Date(startTime).getTime() !== oldStart.getTime()) ||
      (endTime && new Date(endTime).getTime() !== oldEnd.getTime());

    if (timingChanged) {
      await sendMeetingRescheduleEmail(
        meeting.attendees,
        meeting.title,
        oldStart,
        meeting.startTime,
        meeting.endTime,
        user.fullName || "Manager",
        workspace.workspaceName
      );

      scheduleMeetingReminderEmail(meeting.attendees, meeting.title, meeting.startTime);
    } else {
      await sendMeetingScheduledEmail(
        meeting.attendees,
        meeting.title,
        description,
        meeting.startTime,
        meeting.endTime,
        user.fullName || "Manager"
      );
    }
 
    res.status(200).json({
      success: true,
      message: "Meeting updated successfully",
      meeting,
    });
  } catch (err: any) {
    console.error("Error updating meeting:", err);
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};