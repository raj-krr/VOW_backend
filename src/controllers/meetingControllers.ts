import { Request, Response } from "express";
import MeetingModel from "../models/meeting";
import WorkspaceModel from "../models/workspace";
import TeamModel from "../models/team";
import { ApiError } from "../utils/ApiError";
import {
  sendMeetingScheduledEmail,
  scheduleMeetingReminderEmail,
  sendMeetingCancellationEmail,
} from "../middlewares/email";


export const scheduleMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceUser = req.workspaceUser;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { workspaceId } = req.params;
    const { title, description, startTime, endTime, teamId, isConference } = req.body;

    if (!title || !startTime || !endTime)
      throw new ApiError(400, "Missing required meeting details");

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

    const { userId } = workspaceUser;

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const isManager = workspace.manager.toString() === userId.toString();
    const supervisorTeam = await TeamModel.findOne({ workspaceId, superviser: userId });
    const isSupervisor = !!supervisorTeam;

    if (!isManager && !isSupervisor)
      throw new ApiError(403, "Only manager or supervisor can schedule meetings");

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
      startTime : start,
      endTime :end,
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
  workspaceUser.fullName || "Manager"
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
    const workspaceUser = req.params;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { workspaceId } = req.params;
    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const meetings = await MeetingModel.find({ workspace: workspaceId })
      .sort({ startTime: -1 })
      .populate("createdBy", "fullName email");

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (err: any) {
    console.error("Error fetching meetings:", err);
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const deleteMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceUser = req.workspaceUser;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { meetingId } = req.params;
    const { userId } = workspaceUser;

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting) throw new ApiError(404, "Meeting not found");

    const workspace = await WorkspaceModel.findById(meeting.workspace);
    const isManager = workspace?.manager.toString() === userId.toString();
    const supervisorTeam = await TeamModel.findOne({
      workspaceId: workspace?._id,
      superviser: userId,
    });

    if (
      meeting.createdBy.toString() !== userId.toString() &&
      !isManager &&
      !supervisorTeam
    ) {
      throw new ApiError(403, "Not authorized to delete this meeting");
    }


    await meeting.deleteOne();
    await sendMeetingCancellationEmail(
      meeting.attendees,
      meeting.title,
      meeting.startTime,
      workspace?.workspaceName,
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
