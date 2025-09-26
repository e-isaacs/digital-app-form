// utils/dynamicsAuth.js
export async function getDynamicsToken() {
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.DYNAMICS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DYNAMICS_CLIENT_ID,
        client_secret: process.env.DYNAMICS_CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: `${process.env.DYNAMICS_INSTANCE_URL}/.default`,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Dynamics token error: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
