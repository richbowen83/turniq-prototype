export const ORGS = {
  darwin: {
    orgId: "darwin",
    name: "Darwin Homes",
    apiKeyEnv: "TURNIQ_DARWIN_API_KEY",
  },
  demo: {
    orgId: "demo",
    name: "Demo Client",
    apiKeyEnv: "TURNIQ_DEMO_API_KEY",
  },
};

export function getOrgById(orgId) {
  return ORGS[orgId] || null;
}

export function validateOrgApiKey(orgId, apiKey) {
  const org = getOrgById(orgId);
  if (!org) return false;

  const expectedKey = process.env[org.apiKeyEnv];
  return Boolean(expectedKey && apiKey && apiKey === expectedKey);
}