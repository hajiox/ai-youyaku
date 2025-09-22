declare module "aws4" {
  export interface Request {
    host: string;
    method?: string;
    path?: string;
    service?: string;
    region?: string;
    headers?: Record<string, string | string[]>;
    body?: string;
  }

  export interface Credentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }

  export function sign<T extends Request>(request: T, credentials: Credentials): T;

  const aws4: {
    sign: typeof sign;
  };

  namespace aws4 {
    type Request = import('aws4').Request;
    type Credentials = import('aws4').Credentials;
  }

  export default aws4;
}
