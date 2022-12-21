import "../common/set-test-envs";
import {
  MOCK_DATA_SERVICE_ID,
  MOCK_SIGNER_ADDRESS,
  mockDataPackages,
  mockOracleRegistryState,
} from "../common/mock-values";
import { connectToTestDB, dropTestDatabase } from "../common/test-db";
import { DataPackage } from "../../src/data-packages/data-packages.model";
import { sleep } from "../common/test-utils";
import { StreamrListenerService } from "../../src/streamr-listener/streamr-listener.service";
import { DataPackagesService } from "../../src/data-packages/data-packages.service";
import { BundlrService } from "../../src/bundlr/bundlr.service";
import { compressMsg } from "redstone-streamr-proxy";

jest.mock("redstone-sdk", () => ({
  __esModule: true,
  ...jest.requireActual("redstone-sdk"),
  getOracleRegistryState: jest.fn(() => mockOracleRegistryState),
}));

jest.mock("redstone-streamr-proxy", () => ({
  __esModule: true,
  ...jest.requireActual("redstone-streamr-proxy"),
  StreamrClient: jest.fn().mockImplementation(() => ({
    subscribe(_streamId: string, callback: (msg: Uint8Array) => void) {
      callback(compressMsg(mockDataPackages));
    },
    getStream(_streamId: string) {
      return Promise.resolve({ streamId: _streamId });
    },
  })),
}));

jest.mock("../../src/bundlr/bundlr.service");

const expectedSavedDataPackages = [
  {
    ...mockDataPackages[0],
    signerAddress: MOCK_SIGNER_ADDRESS,
    dataServiceId: MOCK_DATA_SERVICE_ID,
    isSignatureValid: true,
    dataFeedId: "___ALL_FEEDS___",
  },
];

describe("Streamr Listener (e2e)", () => {
  let streamrListenerService: StreamrListenerService;

  beforeEach(async () => {
    // Connect to mongoDB in memory
    await connectToTestDB();

    streamrListenerService = new StreamrListenerService(
      new DataPackagesService(),
      new BundlrService()
    );

    (BundlrService.prototype.safelySaveDataPackages as any).mockClear();
  });

  afterEach(async () => await dropTestDatabase());

  it("Should listen to streamr streams and save data in DB", async () => {
    await streamrListenerService.syncStreamrListening();
    await sleep(1000);

    const dataPackagesInDB = await DataPackage.find();
    const dataPackagesInDBCleaned = dataPackagesInDB.map((dp) => {
      const { _id, __v, ...rest } = dp.toJSON() as any;
      _id;
      __v;
      return rest;
    });

    expect(dataPackagesInDBCleaned).toEqual(expectedSavedDataPackages);
  });

  it("Should listen to streamr streams and save data on Bundlr", async () => {
    await streamrListenerService.syncStreamrListening();
    await sleep(1000);

    expect(
      BundlrService.prototype.safelySaveDataPackages
    ).toHaveBeenCalledTimes(1);
    expect(BundlrService.prototype.safelySaveDataPackages).toHaveBeenCalledWith(
      expectedSavedDataPackages
    );
  });

  it("Should listen to streamr streams and save data on Bundlr when allowed data service ids are set", async () => {
    const spy = jest
      .spyOn(streamrListenerService, "getAllowedDataServiceIds")
      .mockReturnValue([
        MOCK_DATA_SERVICE_ID.toLowerCase(),
        "other-data-service",
      ]);

    await streamrListenerService.syncStreamrListening();
    await sleep(1000);

    expect(
      BundlrService.prototype.safelySaveDataPackages
    ).toHaveBeenCalledTimes(1);
    expect(BundlrService.prototype.safelySaveDataPackages).toHaveBeenCalledWith(
      expectedSavedDataPackages
    );

    spy.mockRestore();
  });

  it("Should not listen to streamr streams or save data on Bundlr when no matching allowed data service id is set", async () => {
    const spy = jest
      .spyOn(streamrListenerService, "getAllowedDataServiceIds")
      .mockReturnValue(["other-data-service"]);

    await streamrListenerService.syncStreamrListening();
    await sleep(1000);

    expect(
      BundlrService.prototype.safelySaveDataPackages
    ).toHaveBeenCalledTimes(0);

    spy.mockRestore();
  });
});
