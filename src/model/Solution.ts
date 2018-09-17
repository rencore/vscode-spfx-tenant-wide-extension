import { Feature } from ".";

export interface Solution {
  skipFeatureDeployment?: boolean;
  features?: Feature[];
}