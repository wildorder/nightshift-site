/**
 * The site's certificate, in the one region CloudFront reads certificates from.
 * DNS-validated against the Nightshift zone, which this repository does not
 * own: it names the zone by id and writes only the validation record.
 */
import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import { ACCOUNT, CERTIFICATE_REGION, SITE_HOSTNAME, ZONE_NAME } from "./constants.js";

export interface SiteCertificateStackProps extends StackProps {
  readonly hostedZoneId: string;
}

export class SiteCertificateStack extends Stack {
  readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: SiteCertificateStackProps) {
    const { hostedZoneId, ...stackProps } = props;
    super(scope, id, {
      stackName: "nightshift-site-cert",
      env: { account: ACCOUNT, region: CERTIFICATE_REGION },
      crossRegionReferences: true,
      ...stackProps,
    });
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId,
      zoneName: ZONE_NAME,
    });
    this.certificate = new acm.Certificate(this, "Certificate", {
      domainName: SITE_HOSTNAME,
      validation: acm.CertificateValidation.fromDns(zone),
    });
    new CfnOutput(this, "CertificateArn", { value: this.certificate.certificateArn });
  }
}
