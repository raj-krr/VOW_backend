import { Request, Response } from "express";
import Channel from "../models/channel";

export const createChannel = async (req: Request, res: Response) => {
  try {
    const { name, type = "text", workspaceId, members = [] } = req.body;
    const channel = await Channel.create({ name, type, server: workspaceId, members });
    res.status(201).json(channel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getServerChannels = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const channels = await Channel.find({ server: workspaceId }).populate("members", "username avatar");
    res.json(channels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteChannel = async (req:Request ,res:Response) => {
  try {
    const { channelId } = req.params;

    if (!channelId){
      return res.status(400).json({ success:false, message: "channelId is required"});
    }
    const deletedChannel = await Channel.findByIdAndDelete(channelId);
  if(!deletedChannel){
    res.status(404).json({success:false, message:"channel not found"})
  }
  res.status(200).json({ success:true, message:"channel deleted successfully"});
  }catch(err:any){
    res.status(500).json({ success:false, error:err.message})
  }

};

export const updateChannelName = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { name } = req.body;

    if (!channelId || !name) {
      return res.status(400).json({ success: false, message: "channelId and name are required" });
    }

    const updatedChannel = await Channel.findByIdAndUpdate(
      channelId,
      { name },
      { new: true }
    );

    if (!updatedChannel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    res.status(200).json({ success: true, message: "Channel name updated successfully", channel: updatedChannel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
