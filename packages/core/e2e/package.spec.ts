import path from 'path';
import initialData from './config/initial-data';
import { TEST_SETUP_TIMEOUT_MS, testConfig } from './config/config';
import {
  createTestEnvironment,
  registerInitializer,
  SqljsInitializer
} from '@vendure/testing';
import { CREATE_PACKAGE } from './graphql/admin.graphql';
import {
  CreatePackageMutation,
  CreatePackageMutationVariables
} from './graphql/admin.graphql.types';
import { MassUnit, DistanceUnit } from '../src/ui/shared-types';

registerInitializer(
  'sqljs',
  new SqljsInitializer(path.join(__dirname, '__data__'))
);

describe('package resolver', () => {
  const { server, adminClient } = createTestEnvironment(testConfig);

  beforeAll(async () => {
    await server.init({
      initialData,
      productsCsvPath: path.join(__dirname, 'config/products.csv'),
      customerCount: 2
    });
    await adminClient.asSuperAdmin();
  }, TEST_SETUP_TIMEOUT_MS);

  afterAll(async () => {
    await server.destroy();
  });

  it('createPackage', async () => {
    const { createPackage } = await adminClient.query<
      CreatePackageMutation,
      CreatePackageMutationVariables
    >(CREATE_PACKAGE, {
      input: {
        name: 'Box',
        width: 20,
        height: 20,
        weight: 20,
        length: 20,
        enabled: true,
        massUnit: MassUnit.G,
        distanceUnit: DistanceUnit.Cm
      }
    });

    expect(createPackage).toEqual({
      id: 'T_1',
      name: 'Box',
      width: 20,
      height: 20,
      weight: 20,
      length: 20,
      enabled: true,
      massUnit: 'g',
      distanceUnit: 'cm',
      volume: 20 * 20 * 20
    });
  });
});
