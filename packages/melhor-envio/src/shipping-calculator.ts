import {
  ShippingCalculator,
  LanguageCode,
  Logger,
  CurrencyCode
} from '@vendure/core';
import {
  ShippingPackagesService,
  convertUnit
} from '@vendure-advanced-shipping/core';
import MelhorEnvio from 'menv-js';
import { MelhorEnvioPluginOptions } from './types';

export function createShippingCalculator({
  timeout,
  token,
  isSandbox,
  postalCode
}: MelhorEnvioPluginOptions): ShippingCalculator {
  let shippingPackagesService: ShippingPackagesService;
  const melhorEnvio = new MelhorEnvio(token, isSandbox, timeout);

  return new ShippingCalculator({
    code: 'melhor-envio',
    description: [
      {
        languageCode: LanguageCode.en,
        value: 'Melhor Envio Shipping Calculator'
      },
      {
        languageCode: LanguageCode.pt_BR,
        value: 'Calculadora da Melhor Envio'
      }
    ],
    args: {
      service: {
        type: 'string',
        label: [
          {
            languageCode: LanguageCode.en,
            value: 'Service'
          },
          {
            languageCode: LanguageCode.pt_BR,
            value: 'Serviço'
          }
        ],
        config: {
          options: [
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Correios - PAC'
                }
              ],
              value: '1'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Correios - SEDEX'
                }
              ],
              value: '2'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Correios - Mini Envios'
                }
              ],
              value: '17'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Jadlog - .Package'
                }
              ],
              value: '3'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Jadlog - .com'
                }
              ],
              value: '4'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Via Brasil - Rodoviário'
                }
              ],
              value: '9'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Azul Cargo Express - Amanhã'
                }
              ],
              value: '15'
            },
            {
              label: [
                {
                  languageCode: LanguageCode.en,
                  value: 'Azul Cargo Express - e-commerce'
                }
              ],
              value: '16'
            }
          ]
        }
      },
      receipt: {
        type: 'boolean',
        value: true,
        label: [
          {
            languageCode: LanguageCode.en,
            value: 'Receipt'
          },
          {
            languageCode: LanguageCode.pt_BR,
            value: 'Receita'
          }
        ]
      },
      ownHand: {
        type: 'boolean',
        value: true,
        label: [
          {
            languageCode: LanguageCode.en,
            value: 'Own Hand Service'
          },
          {
            languageCode: LanguageCode.pt_BR,
            value: 'Serviço de mão própria'
          }
        ]
      }
    },
    init: (injector) => {
      shippingPackagesService = injector.get(ShippingPackagesService);
    },
    calculate: async (order, { service, receipt, ownHand }) => {
      const customerPostalCode = order.shippingAddress.postalCode;

      if (!customerPostalCode) {
        return undefined;
      }
      const {
        packages: shippingPackages
      } = await shippingPackagesService.create(order);

      // Returns empty when have more than one package
      if (
        !shippingPackages ||
        shippingPackages.length === 0 ||
        shippingPackages.length > 1
      ) {
        return undefined;
      }

      const packageData = shippingPackages[0];

      try {
        const response = await melhorEnvio.calculateShipment(
          postalCode,
          customerPostalCode,
          {
            weight: convertUnit(packageData.totalWeight)
              .from(packageData.massUnit)
              .to('kg'),
            length: convertUnit(packageData.length)
              .from(packageData.distanceUnit)
              .to('cm'),
            height: convertUnit(packageData.height)
              .from(packageData.distanceUnit)
              .to('cm'),
            width: convertUnit(packageData.width)
              .from(packageData.distanceUnit)
              .to('cm')
          },
          service,
          receipt,
          ownHand,
          order.subTotal / 100
        );
        // @ts-ignore
        if (response.error) {
          // @ts-ignore
          Logger.error(response.error);
          return undefined;
        }
        const price = Number(response.price) * 100;
        return {
          price: price,
          priceWithTax: price,
          metadata: {
            deliveryTime: Number(response.delivery_time),
            carrier: `melhor-envio-${response.company.name}`,
            service: null,
            currency: CurrencyCode.BRL
          }
        };
      } catch (error) {
        Logger.error(error);
        return undefined;
      }
    }
  });
}
