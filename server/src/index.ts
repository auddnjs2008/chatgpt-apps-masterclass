/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 * asdfß
 */

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'agents/mcp';
import z from 'zod';
import {
	fetchMovieByGenre,
	fetchMovieDetails,
	fetchMovieGenres,
	fetchMovieReviews,
	fetchMoviesSearch,
	fetchNowPlayingMovies,
	fetchSimilarMovies,
	fetchUpcomingMovies,
} from './fetcher';

const WIDGET_URI = 'ui://movies-widget';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const API_KEY = env.API_KEY;

		const server = new McpServer({
			name: 'Movies Server',
			version: '1.0',
		});

		registerAppResource(server, 'Movies Widget', WIDGET_URI, { description: 'Movies widget' }, async () => {
			const html = await env.ASSETS.fetch(new URL('http://hello/index.html'));
			return {
				contents: [
					{
						uri: WIDGET_URI,
						text: await html.text(),
						mimeType: RESOURCE_MIME_TYPE,
						_meta: {
							ui: {
								csp: {
									connectDoamins: ['https://*.workers.dev'],
									resourceDomains: [
										'https://*.workers.dev',
										'https://fonts.googleapis.com',
										'https://fonts.gstatic.com',
										'https://image.tmdb.org',
									],
								},
							},
						},
					},
				],
			};
		});

		registerAppTool(
			server,
			'get-upcoming-movies',
			{
				title: 'Get Upcoming Movies',
				description: `Use this when the user wants to see the movies that are going to be released soon or in the future.Do not
				use this for movies that are currently playing in theaters or available for streaming.`,
				inputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching upcoming movies...',
					'openai/toolInvocation/invoked': 'Done',
				},
			},
			async () => {
				const movies = await fetchUpcomingMovies(API_KEY);

				return {
					content: [{ text: JSON.stringify(movies), type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-now-playing-movies',
			{
				title: 'Get Now Playing Movies',
				description: `Use this when the user wants to see the movies that are playing right now.  Do not
				use this for streaming movies or to check the availability of upcoming releases. Do not use this to find a specific movie`,
				inputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching now playing movies...',
					'openai/toolInvocation/invoked': 'Done',
				},
			},
			async () => {
				const movies = await fetchNowPlayingMovies(API_KEY);

				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-similar-movies',
			{
				title: 'Get Similar Movies',
				description: `Use this when the user wants to find similar movies to a specific movie. Requires a movie ID from a previous list.
				Do not use before identifying a specific movie`,
				inputSchema: {
					movieId: z.number().positive()
						.describe(`The ID of the movie to find similar movies for. Obtained by calling other tools first like
						"get-upcoming-movies" or "get-now-playing-movies" `),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching similar movies...',
					'openai/toolInvocation/invoked': 'Done',
				},
			},
			async ({ movieId }) => {
				const movies = await fetchSimilarMovies(movieId, API_KEY);

				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-movie-reviews',
			{
				title: 'Get Movie Reviews',
				description: `Use this when the user wants to find reviews about a specific movie. Requires a movie ID from a previous list. 
				Do not use before identifying a specific movie.`,
				inputSchema: {
					movieId: z.number().positive()
						.describe(`The ID of the movie to find similar movies for. Obtained by calling other tools first like
						"get-upcoming-movies" or "get-now-playing-movies" `),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					'openai/toolInvocation/invoking': 'Fetching reviews...',
					'openai/toolInvocation/invoked': 'Done',
				},
			},
			async ({ movieId }) => {
				const reviews = await fetchMovieReviews(movieId, API_KEY);

				return {
					content: [{ text: JSON.stringify(reviews), type: 'text' }],
				};
			},
		);

		registerAppTool(
			server,
			'get-movie-genres',
			{
				title: 'Get Movie Genres',
				description:
					'Use this to get the list of genres ID. This should be used before calling the `get-movies-by-genre` tool. Do not use this to search for movies directly.',
				inputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					'openai/toolInvocation/invoking': 'Fetching genres...',
					'openai/toolInvocation/invoked': 'Done',
				},
			},
			async () => {
				const genres = await fetchMovieGenres(API_KEY);

				return {
					content: [{ text: JSON.stringify(genres), type: 'text' }],
				};
			},
		);

		registerAppTool(
			server,
			'get-movies-by-genre',
			{
				title: 'Get Movies by Genre',
				description:
					'Use this when the user wants to find movies by a specific genre. Use `get-movie-genres` first to get the list of genre IDs first.',
				inputSchema: {
					genreId: z
						.number()
						.positive()
						.describe(
							'The ID of the genre to find movies for. Obtained by calling `get-movie-genres` tool. (example: 28 for Action, 99 for documentary)',
						),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching movies...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async ({ genreId }) => {
				const movies = await fetchMovieByGenre(genreId, API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-movie-details',
			{
				title: 'Get Movie Details',
				description:
					'Use this when the user wants to see more details about a specific movie. Details like synopsis, cast, and production companies are available here. Requires a movie ID from a previous list. Do not use this tool before identifying the movie.',
				inputSchema: {
					movieId: z.number().positive().describe('The ID of the movie to find details for. Obtained by any of the list movie tools'),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching movie details...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async ({ movieId }) => {
				const movie = await fetchMovieDetails(movieId, API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movie },
				};
			},
		);

		registerAppTool(
			server,
			'find-movies',
			{
				title: 'Find Movies',
				description:
					'여러 조건(장르, 평점, 출시 연도 등)에 따라 영화를 찾고 싶을 때 사용하세요. 원하는 필터를 지정해 추천받을 수 있습니다.',
				inputSchema: {
					certification: z.string().optional().describe('Certification value (e.g., PG-13). Use with region.'),
					'certification.gte': z.string().optional().describe('Lower bound for certification. Use with region.'),
					'certification.lte': z.string().optional().describe('Upper bound for certification. Use with region.'),
					certification_country: z
						.string()
						.optional()
						.describe('Country for the certification-related filters. Use with certification, certification.gte, or certification.lte.'),
					include_adult: z.boolean().optional().default(false).describe('Whether to include adult content. Default: false.'),
					include_video: z.boolean().optional().default(false).describe('Whether to include video content. Default: false.'),
					language: z.string().optional().default('en-US').describe('ISO 639-1 value to display translated data. Default: en-US.'),
					page: z.number().int().optional().default(1).describe('Page number of results to return. Default: 1.'),
					primary_release_year: z.number().int().optional().describe('Returns movies released in a specific year.'),
					'primary_release_date.gte': z.string().optional().describe('Minimum primary release date (YYYY-MM-DD).'),
					'primary_release_date.lte': z.string().optional().describe('Maximum primary release date (YYYY-MM-DD).'),
					region: z.string().optional().describe('ISO 3166-1 code for results region.'),
					'release_date.gte': z.string().optional().describe('Minimum theatrical release date (YYYY-MM-DD).'),
					'release_date.lte': z.string().optional().describe('Maximum theatrical release date (YYYY-MM-DD).'),
					sort_by: z
						.string()
						.optional()
						.default('popularity.desc')
						.describe('Sort results by. E.g., popularity.desc, release_date.desc, vote_average.desc'),
					'vote_average.gte': z.number().optional().describe('Minimum average vote.'),
					'vote_average.lte': z.number().optional().describe('Maximum average vote.'),
					'vote_count.gte': z.number().optional().describe('Minimum number of votes.'),
					'vote_count.lte': z.number().optional().describe('Maximum number of votes.'),
					watch_region: z
						.string()
						.optional()
						.describe('Region to filter on streaming availability. Used with with_watch_monetization_types or with_watch_providers.'),
					with_cast: z.string().optional().describe('Filter by cast (comma or pipe separated person IDs).'),
					with_companies: z.string().optional().describe('Filter by companies (comma or pipe separated company IDs).'),
					with_crew: z.string().optional().describe('Filter by crew (comma or pipe separated person IDs).'),
					with_genres: z.string().optional().describe('Filter by genres (comma or pipe separated genre IDs).'),
					with_keywords: z.string().optional().describe('Filter by keywords (comma or pipe separated keyword IDs).'),
					with_origin_country: z.string().optional().describe('Filter by production country.'),
					with_original_language: z.string().optional().describe('Filter by original language (ISO 639-1 code).'),
					with_people: z.string().optional().describe('Filter by people (comma or pipe separated person IDs).'),
					with_release_type: z.string().optional().describe('Release types: 1,2,3,4,5,6. Comma or pipe separated, can use with region.'),
					'with_runtime.gte': z.number().int().optional().describe('Minimum runtime in minutes.'),
					'with_runtime.lte': z.number().int().optional().describe('Maximum runtime in minutes.'),
					with_watch_monetization_types: z
						.string()
						.optional()
						.describe(
							'Filter by watch monetization types (comma or pipe separated: flatrate, free, ads, rent, buy). Used with watch_region.',
						),
					with_watch_providers: z
						.string()
						.optional()
						.describe('Filter by streaming providers (comma or pipe separated provider IDs). Used with watch_region.'),
					without_companies: z.string().optional().describe('Exclude company IDs (comma or pipe separated).'),
					without_genres: z.string().optional().describe('Exclude genre IDs (comma or pipe separated).'),
					without_keywords: z.string().optional().describe('Exclude keyword IDs (comma or pipe separated).'),
					without_watch_providers: z.string().optional().describe('Exclude streaming provider IDs (comma or pipe separated).'),
					year: z.number().int().optional().describe('Year of release.'),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Searching movies',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async (params) => {
				const movies = await fetchMoviesSearch(API_KEY, params);
				return {
					content: [{ text: JSON.stringify(movies), type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		const handler = createMcpHandler(server);

		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
