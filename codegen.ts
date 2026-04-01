import type { CodegenConfig } from '@graphql-codegen/cli';
import { FLARE_REWARDS_SUBGRAPH_URL } from './src/lib/subgraph-urls';

const config: CodegenConfig = {
	schema: FLARE_REWARDS_SUBGRAPH_URL,
	documents: 'src/**/*.graphql',
	generates: {
		'src/generated-graphql.ts': {
			plugins: ['typescript', 'typescript-operations', 'typescript-document-nodes'],
			config: {
				namingConvention: {
					enumValues: 'keep'
				}
			}
		}
	}
};

export default config;
