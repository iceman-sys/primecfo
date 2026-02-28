declare module 'intuit-oauth' {
  export default class OAuthClient {
    constructor(config: {
      clientId: string;
      clientSecret: string;
      environment: string;
      redirectUri: string;
    });
    
    static scopes: {
      Accounting: string;
      OpenId: string;
      Payment: string;
    };
    
    authorizeUri(params: {
      scope: string[];
      state?: string;
    }): string;
    
    createToken(authorizationCode: string): Promise<any>;
    
    setToken(token: {
      access_token: string;
      refresh_token: string;
      token_type: string;
    }): void;
    
    getToken(): any;
    
    refresh(): Promise<any>;
    
    revoke(): Promise<any>;
    
    isAccessTokenValid(): boolean;
  }
}
