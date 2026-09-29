import type { App } from "aws-cdk-lib";
import { SiteCertificateStack } from "./site-cert-stack.js";
import { SiteStack } from "./site-stack.js";

/** Both stacks, composed once, so the app and its test build the same thing. */
export const buildApp = (app: App, sitePath: string) => {
  const hostedZoneId = app.node.tryGetContext("hostedZoneId");
  if (typeof hostedZoneId !== "string" || hostedZoneId === "") {
    throw new Error("the hostedZoneId context value is required (cdk.json, or -c hostedZoneId=…)");
  }
  const cert = new SiteCertificateStack(app, "SiteCertificate", { hostedZoneId });
  const site = new SiteStack(app, "Site", {
    certificate: cert.certificate,
    hostedZoneId,
    sitePath,
  });
  site.addDependency(cert);
  return { cert, site };
};
