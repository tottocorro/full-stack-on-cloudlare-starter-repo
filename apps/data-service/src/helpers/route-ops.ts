import { getLink } from "@repo/data-ops/queries/links";
import { linkSchema, LinkSchemaType } from "@repo/data-ops/zod-schema/links";
import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";
import moment from "moment";

async function getLinkInfoFromKv(env: Env, id: string) {
    const linkInfo = await env.CACHE.get(id)
    if (!linkInfo) return null;
    try {
		const parsedLinkInfo = JSON.parse(linkInfo);
		return linkSchema.parse(parsedLinkInfo);
	} catch (error) {
		return null;
	}
}

const TTL_TIME = 60 * 60 * 24 // 1 day

async function saveLinkInfoToKv(env: Env, id: string, linkInfo: LinkSchemaType) {
	try {
		await env.CACHE.put(id, JSON.stringify(linkInfo),
        {
            expirationTtl: TTL_TIME
        }
    );
	} catch (error) {
		console.error('Error saving link info to KV:', error);
	}
}


export async function getRoutingDestinations(env: Env, id: string) {
    const linkInfo = await getLinkInfoFromKv(env, id);
    if (linkInfo) return linkInfo;
    const linkInfoFromDb = await getLink(id);
    if (!linkInfoFromDb) return null;
    await saveLinkInfoToKv(env, id, linkInfoFromDb);
    return linkInfoFromDb
}


export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInfo.destinations.default;
	}

	// Check if the country code exists in destinations
	if (linkInfo.destinations[countryCode]) {
		return linkInfo.destinations[countryCode];
	}

	// Fallback to default
	return linkInfo.destinations.default;
}

// make sure to import LinkClickMessageType
// import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";
export async function scheduleEvalWorkflow(env: Env, event: LinkClickMessageType) {
	const doId = env.EVALUATION_SCHEDULER.idFromName(`${event.data.id}:${event.data.destination}`);
	const stub = env.EVALUATION_SCHEDULER.get(doId);
	await stub.collectLinkClick(
		event.data.accountId,
		event.data.id,
		event.data.destination,
		event.data.country || "UNKNOWN"
	)
}

export async function captureLinkClickInBackground(env: Env, linkClickMessage: LinkClickMessageType) {
	await env.QUEUE.send(linkClickMessage)
	const doId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(linkClickMessage.data.accountId);
	const stub = env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	if (!linkClickMessage.data.latitude || !linkClickMessage.data.longitude || !linkClickMessage.data.country) return
	await stub.addClick(
		linkClickMessage.data.latitude,
		linkClickMessage.data.longitude,
		linkClickMessage.data.country,
		moment().valueOf()
	)
}
