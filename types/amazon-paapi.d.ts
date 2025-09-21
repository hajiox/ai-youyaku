declare module "amazon-paapi" {
  type SearchItemsRequest = {
    Keywords: string;
    ItemCount?: number;
    Marketplace?: string;
    Resources?: string[];
    SearchIndex?: string;
  };

  type SearchItemsResponse = {
    SearchResult?: {
      Items?: Array<{
        ASIN?: string;
        DetailPageURL?: string;
        Images?: {
          Primary?: {
            Medium?: {
              URL?: string;
            };
          };
        };
        ItemInfo?: {
          Title?: {
            DisplayValue?: string;
          };
        };
        Offers?: {
          Listings?: Array<{
            Price?: {
              DisplayAmount?: string;
              Amount?: number;
              Currency?: string;
            };
          }>;
        };
        CustomerReviews?: {
          StarRating?: number;
          Count?: number;
        };
      }>;
    };
  };

  interface AmazonPaapiConfig {
    accessKey: string;
    secretKey: string;
    partnerTag: string;
    partnerType: "Associates";
    region?: string;
    host?: string;
  }

  export default class AmazonPaapi {
    constructor(config: AmazonPaapiConfig);
    searchItems(payload: SearchItemsRequest): Promise<SearchItemsResponse>;
  }
}
