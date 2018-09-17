import { FeatureAssets } from ".";

export interface Feature {
  assets?: FeatureAssets;
  description: string;
  id: string;
  title: string;
  version: string;
}