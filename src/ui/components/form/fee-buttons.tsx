import React, {
  FunctionComponent,
  MouseEvent,
  useCallback,
  useEffect,
  useState
} from "react";

import styleFeeButtons from "./fee-buttons.module.scss";

import { Currency } from "../../../common/currency";
import { Dec } from "@everett-protocol/cosmosjs/common/decimal";
import { Coin } from "@everett-protocol/cosmosjs/common/coin";
import { CoinUtils } from "../../../common/coin-utils";
import { useFormContext } from "react-hook-form";
import { DecUtils } from "../../../common/dec-utils";
import {
  Button,
  ButtonGroup,
  FormFeedback,
  FormGroup,
  Label
} from "reactstrap";

import classnames from "classnames";
import { useLanguage } from "../../popup/language";
import { useStore } from "../../popup/stores";
import { getFiatCurrencyFromLanguage } from "../../../common/currency";
import { observer } from "mobx-react";

export type GasPriceStep = {
  low: Dec;
  average: Dec;
  high: Dec;
};

export const DefaultGasPriceStep: GasPriceStep = {
  low: new Dec("0.01"),
  average: new Dec("0.025"),
  high: new Dec("0.04")
};

export interface FeeButtonsProps {
  className?: string;
  label?: string;
  feeSelectLabels?: {
    low: string;
    average: string;
    high: string;
  };
  error?: string;

  // TODO: handle muliple fees.
  currency: Currency;
  gas: number;
  gasPriceStep: GasPriceStep;

  name: string;
}

enum FeeSelect {
  LOW,
  AVERAGE,
  HIGH
}

export const FeeButtons: FunctionComponent<FeeButtonsProps> = observer(
  ({
    label,
    feeSelectLabels = { low: "Low", average: "Average", high: "High" },
    error,
    currency,
    gas,
    gasPriceStep,
    name
  }) => {
    const { priceStore } = useStore();
    const language = useLanguage();
    const { setValue } = useFormContext();

    const [feeSelect, setFeeSelect] = useState(FeeSelect.AVERAGE);
    const [feeLow, setFeeLow] = useState<Coin | undefined>();
    const [feeAverage, setFeeAverage] = useState<Coin | undefined>();
    const [feeHigh, setFeeHigh] = useState<Coin | undefined>();

    const fiatCurrency = getFiatCurrencyFromLanguage(language.language);
    const price =
      priceStore.getValue(fiatCurrency.currency, currency.coinGeckoId)?.value ||
      new Dec(0);

    useEffect(() => {
      if (!priceStore.hasFiat(fiatCurrency.currency) && currency.coinGeckoId) {
        priceStore.fetchValue([fiatCurrency.currency], [currency.coinGeckoId]);
      }
    }, [currency.coinGeckoId, fiatCurrency.currency, priceStore]);

    useEffect(() => {
      if (price.gt(new Dec(0))) {
        let precision = new Dec(1);
        for (let i = 0; i < currency.coinDecimals; i++) {
          precision = precision.mul(new Dec(10));
        }

        const feeLow = new Coin(
          currency.coinMinimalDenom,
          gasPriceStep.low.mul(new Dec(gas.toString())).truncate()
        );
        setFeeLow(feeLow);

        const feeAverage = new Coin(
          currency.coinMinimalDenom,
          gasPriceStep.average.mul(new Dec(gas.toString())).truncate()
        );
        setFeeAverage(feeAverage);

        const feeHigh = new Coin(
          currency.coinMinimalDenom,
          gasPriceStep.high.mul(new Dec(gas.toString())).truncate()
        );
        setFeeHigh(feeHigh);
      } else {
        setFeeLow(undefined);
        setFeeAverage(undefined);
        setFeeHigh(undefined);
      }
    }, [
      currency.coinDecimals,
      currency.coinMinimalDenom,
      gas,
      gasPriceStep.average,
      gasPriceStep.high,
      gasPriceStep.low,
      price
    ]);

    useEffect(() => {
      if (feeSelect === FeeSelect.LOW) {
        setValue(name, feeLow);
      } else if (feeSelect === FeeSelect.AVERAGE) {
        setValue(name, feeAverage);
      } else if (feeSelect === FeeSelect.HIGH) {
        setValue(name, feeHigh);
      } else {
        throw new Error("Invalid fee select");
      }
    }, [feeAverage, feeHigh, feeLow, feeSelect, name, setValue]);

    const [inputId] = useState(() => {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return `input-${Buffer.from(bytes).toString("hex")}`;
    });

    return (
      <FormGroup>
        {label ? (
          <Label for={inputId} className="form-control-label">
            {label}
          </Label>
        ) : null}
        <ButtonGroup id={inputId} className={styleFeeButtons.buttons}>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={feeSelect === FeeSelect.LOW ? "primary" : undefined}
            onClick={useCallback((e: MouseEvent) => {
              setFeeSelect(FeeSelect.LOW);
              e.preventDefault();
            }, [])}
          >
            <div className={styleFeeButtons.title}>{feeSelectLabels.low}</div>
            <div
              className={classnames(styleFeeButtons.fiat, {
                "text-muted": feeSelect !== FeeSelect.LOW
              })}
            >
              {price.gt(new Dec(0)) && feeLow
                ? `${
                    fiatCurrency.symbol
                  }${DecUtils.removeTrailingZerosFromDecStr(
                    fiatCurrency.parse(
                      parseFloat(
                        new Dec(feeLow.amount)
                          .quoTruncate(
                            DecUtils.getPrecisionDec(currency.coinDecimals)
                          )
                          .mul(price)
                          .toString()
                      )
                    )
                  )}`
                : "?"}
            </div>
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": feeSelect !== FeeSelect.LOW
              })}
            >
              {feeLow
                ? `${DecUtils.removeTrailingZerosFromDecStr(
                    CoinUtils.parseDecAndDenomFromCoin(feeLow).amount
                  )}${currency.coinDenom}`
                : "loading"}
            </div>
          </Button>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={feeSelect === FeeSelect.AVERAGE ? "primary" : undefined}
            onClick={useCallback((e: MouseEvent) => {
              setFeeSelect(FeeSelect.AVERAGE);
              e.preventDefault();
            }, [])}
          >
            <div className={styleFeeButtons.title}>
              {feeSelectLabels.average}
            </div>
            <div
              className={classnames(styleFeeButtons.fiat, {
                "text-muted": feeSelect !== FeeSelect.AVERAGE
              })}
            >
              {price.gt(new Dec(0)) && feeAverage
                ? `${
                    fiatCurrency.symbol
                  }${DecUtils.removeTrailingZerosFromDecStr(
                    fiatCurrency.parse(
                      parseFloat(
                        new Dec(feeAverage.amount)
                          .quoTruncate(
                            DecUtils.getPrecisionDec(currency.coinDecimals)
                          )
                          .mul(price)
                          .toString()
                      )
                    )
                  )}`
                : "?"}
            </div>
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": feeSelect !== FeeSelect.AVERAGE
              })}
            >
              {feeAverage
                ? `${DecUtils.removeTrailingZerosFromDecStr(
                    CoinUtils.parseDecAndDenomFromCoin(feeAverage).amount
                  )}${currency.coinDenom}`
                : "loading"}
            </div>
          </Button>
          <Button
            type="button"
            className={styleFeeButtons.button}
            color={feeSelect === FeeSelect.HIGH ? "primary" : undefined}
            onClick={useCallback((e: MouseEvent) => {
              setFeeSelect(FeeSelect.HIGH);
              e.preventDefault();
            }, [])}
          >
            <div className={styleFeeButtons.title}>{feeSelectLabels.high}</div>
            <div
              className={classnames(styleFeeButtons.fiat, {
                "text-muted": feeSelect !== FeeSelect.HIGH
              })}
            >
              {price.gt(new Dec(0)) && feeHigh
                ? `${
                    fiatCurrency.symbol
                  }${DecUtils.removeTrailingZerosFromDecStr(
                    fiatCurrency.parse(
                      parseFloat(
                        new Dec(feeHigh.amount)
                          .quoTruncate(
                            DecUtils.getPrecisionDec(currency.coinDecimals)
                          )
                          .mul(price)
                          .toString()
                      )
                    )
                  )}`
                : "?"}
            </div>
            <div
              className={classnames(styleFeeButtons.coin, {
                "text-muted": feeSelect !== FeeSelect.HIGH
              })}
            >
              {feeHigh
                ? `${DecUtils.removeTrailingZerosFromDecStr(
                    CoinUtils.parseDecAndDenomFromCoin(feeHigh).amount
                  )}${currency.coinDenom}`
                : "loading"}
            </div>
          </Button>
        </ButtonGroup>
        {error ? (
          <FormFeedback style={{ display: "block" }}>{error}</FormFeedback>
        ) : null}
      </FormGroup>
    );
  }
);
