import { Request, Response } from "express";
import TeamModel from "../models/team";
import WorkspaceModel from "../models/workspace";
import { ApiError } from "../utils/ApiError";
import { Types } from "mongoose";


export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, memberIds, superviser } = req.body;
    const workspaceUser = req.workspaceUser;

    if (!workspaceUser) throw new ApiError(401, "Not authorized");

    const { workspaceId, userId } = workspaceUser;

    if (!name) throw new ApiError(400, "Team name is required");

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    
    if (workspace.manager.toString() !== userId.toString())
      throw new ApiError(403, "Only admin can create a team");

    
    const validMembers = (memberIds || []).filter((id: string) =>
      workspace.members.map((m) => m.toString()).includes(id)
    );

    
    let lead = null;
    if (superviser && validMembers.includes(superviser)) lead = superviser;

    const team = await TeamModel.create({
      name,
      workspaceId,
      members: validMembers,
      superviser: lead,
    });

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      team,
    });
  } catch (err: any) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};


export const renameTeam = async (req: Request, res: Response) => {
  try {
    const { newName } = req.body;
    const { teamId } = req.params;
    const workspaceUser = req.workspaceUser;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { workspaceId, userId } = workspaceUser;

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const team = await TeamModel.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

  
    if (
      workspace.manager.toString() !== userId.toString() &&
      team.superviser?.toString() !== userId.toString()
    )
      throw new ApiError(403, "You are not allowed to rename this team");

    team.name = newName;
    await team.save();

    res.json({ success: true, message: "Team renamed successfully", team });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};


export const removeMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.body;
    const { teamId } = req.params;
    const workspaceUser = req.workspaceUser;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { workspaceId, userId } = workspaceUser;

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const team = await TeamModel.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    if (
      workspace.manager.toString() !== userId.toString() &&
      team.superviser?.toString() !== userId.toString()
    )
      throw new ApiError(403, "You are not allowed to remove members");

    team.members = team.members.filter(
      (id: Types.ObjectId) => id.toString() !== memberId
    );

    if (team.superviser?.toString() === memberId) team.superviser = null;

    await team.save();
    res.json({ success: true, message: "Member removed", team });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const assignSuperviser= async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    const { teamId } = req.params;
    const workspaceUser = req.workspaceUser;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { workspaceId, userId } = workspaceUser;

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const team = await TeamModel.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    if (workspace.manager.toString() !== userId.toString())
      throw new ApiError(403, "Only admin can assign a team lead");

    if (!team.members.map((id) => id.toString()).includes(leadId))
      throw new ApiError(400, "Lead must be a team member");

    team.superviser = leadId;
    await team.save();

    res.json({ success: true, message: "Team lead assigned", team });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const getAllTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceUser = req.workspaceUser;
    if (!workspaceUser) throw new ApiError(401, "Unauthorized");

    const { workspaceId } = workspaceUser;

    const workspace = await WorkspaceModel.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    const teams = await TeamModel.find({ workspaceId })
      .populate("members", "fullName email")
      .populate("teamLead", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: teams.length,
      teams,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};
