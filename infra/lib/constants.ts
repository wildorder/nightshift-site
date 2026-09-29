/** The site's one address: the apex of the zone the Nightshift product owns. */
export const ZONE_NAME = "nightshift.wildorder.dev";
export const SITE_HOSTNAME = ZONE_NAME;
export const SITE_URL = `https://${SITE_HOSTNAME}`;

/** The account and regions the Nightshift zone lives in. CloudFront takes certificates from us-east-1 only. */
export const ACCOUNT = "755348349819";
export const PRIMARY_REGION = "us-west-2";
export const CERTIFICATE_REGION = "us-east-1";
