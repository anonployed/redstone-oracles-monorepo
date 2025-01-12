import { IPricesContractAdapter } from "@redstone-finance/sdk";
import { Account } from "fuels";
import { Prices } from "../autogenerated";
import { FuelContractConnector } from "../FuelContractConnector";
import { FuelPricesContractAdapter } from "./FuelPricesContractAdapter";

export type FuelPricesContract = Prices;

export class FuelPricesContractConnector extends FuelContractConnector<IPricesContractAdapter> {
  constructor(
    wallet: Account | undefined,
    private contractId: string
  ) {
    super(wallet);
  }

  getContract(): FuelPricesContract {
    return new Prices(this.contractId, this.wallet!);
  }

  async getAdapter(): Promise<IPricesContractAdapter> {
    return await Promise.resolve(
      new FuelPricesContractAdapter(this.getContract(), this.getGasLimit())
    );
  }
}
