export default async function handleAuthorizeGet(request: Request, env: Env) {
	const url = new URL(request.url);
	const clientId = url.searchParams.get('client_id');
	if (!clientId) {
		return new Response(null, { status: 400 });
	}
	env.OAUTH_PROVIDER.lookupClient('');
	return new Response();
}
