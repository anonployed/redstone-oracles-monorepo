import {
  ContractParamsProvider,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import { BigNumberish } from "ethers";
import { hexZeroPad } from "ethers/lib/utils";
import { BN, FunctionInvocationScope, FunctionResult } from "fuels";
import { InvocationResult } from "../InvocationResult";
import { Vec } from "../autogenerated/common";
import { FuelPricesContract } from "./FuelPricesContractConnector";

export class FuelPricesContractAdapter implements IPricesContractAdapter {
  constructor(
    public contract: FuelPricesContract,
    private gasLimit: number
  ) {}

  async getPricesFromPayload(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    return this.extractNumbers(
      await this.contract.functions
        .get_prices(
          paramsProvider.getHexlifiedFeedIds(),
          await paramsProvider.getPayloadData()
        )
        .get()
    );
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    return this.extractNumbers(
      await this.call(
        this.contract.functions.write_prices(
          paramsProvider.getHexlifiedFeedIds(),
          await paramsProvider.getPayloadData()
        ),
        this.getGasLimit(
          paramsProvider.getDataFeedIds().length,
          paramsProvider.requestParams.uniqueSignersCount
        )
      )
    );
  }

  async readPricesFromContract(
    paramsProvider: ContractParamsProvider
  ): Promise<BigNumberish[]> {
    return this.extractNumbers(
      await this.contract.functions
        .read_prices(paramsProvider.getHexlifiedFeedIds())
        .get()
    );
  }

  async readTimestampFromContract(): Promise<number> {
    return (
      await this.contract.functions.read_timestamp().get()
    ).value.toNumber();
  }

  async init(signers: string[], signerCountThreshold: number): Promise<void> {
    await this.call(
      this.contract.functions.init(
        signers.map((signer) => hexZeroPad(signer, 32)),
        signerCountThreshold
      )
    );
  }

  protected async call<TArgs extends Array<unknown>, TReturn>(
    functionInvocationScope: FunctionInvocationScope<TArgs, TReturn>,
    gasLimit?: number
  ): Promise<FunctionResult<TReturn>> {
    const { waitForResult } = await functionInvocationScope
      .txParams({
        gasLimit: gasLimit ?? this.gasLimit,
      })
      .call();

    return await waitForResult();
  }

  protected extractNumbers(result: InvocationResult<Vec<BN>>): BigNumberish[] {
    return result.value.map((num) => BigInt(num.toString("hex")));
  }

  private getGasLimit(dataFeedIdCount: number, uniqueSignersCount: number) {
    return (
      dataFeedIdCount * uniqueSignersCount * 65000 +
      100000 * dataFeedIdCount +
      60000
    );
  }
}
