import { campaignDispatch } from "./campaign-dispatch";
import { campaignTick } from "./campaign-tick";
import { postCallAnalysis } from "./post-call";

export const functions = [postCallAnalysis, campaignDispatch, campaignTick];
