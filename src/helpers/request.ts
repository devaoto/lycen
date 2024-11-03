import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosRequestHeaders,
  type AxiosResponse,
} from "axios";
import Bun from "bun";

const userAgents = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/37.0.2062.94 Chrome/37.0.2062.94 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko",
  "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/600.8.9 (KHTML, like Gecko) Version/8.0.8 Safari/600.8.9",
  "Mozilla/5.0 (iPad; CPU OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H321 Safari/600.1.4",
  "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36",
];

const corsProxies = [
  "https://cors.ayoko.fun",
  "http://5.161.134.232:4100",
  "http://3.20.37.50:8082",
  "http://213.203.179.36:8008",
  "http://51.138.85.184:8081",
  "http://67.159.226.106:9999",
  "http://104.199.255.76:8090",
  "http://92.53.64.57:8383",
  "http://189.20.192.242:9999",
  "http://75.6.52.42:38242",
  "http://161.35.95.198:3002",
  "http://213.136.80.56:8081",
  "http://200.91.201.189:8002",
  "http://159.69.124.78:9999",
  "http://157.230.41.150:1888",
  "http://164.92.69.24:33777",
  "http://15.229.14.194:9999",
  "http://47.100.44.120:18061",
  "http://84.16.241.179:8182",
  "http://144.91.127.139:9090",
  "http://34.87.139.193:8090",
  "http://35.176.192.182:3000",
  "http://45.76.250.195:8090",
  "http://185.125.218.206:8088",
  "http://54.152.139.39:1983",
  "http://167.114.208.155:8082",
  "http://110.4.41.173:3092",
  "http://167.71.130.240:9000",
  "http://157.245.85.48:9090",
  "http://51.68.139.221:3002",
  "http://80.211.123.117:32768",
  "http://51.91.218.116:30010",
  "http://64.227.129.186:9098",
  "http://159.65.139.98:8800",
  "http://103.146.177.95:8188",
  "http://64.46.34.227:8888",
  "http://213.170.133.146:8088",
  "http://52.47.209.162:10444",
  "http://52.47.209.162:10445",
  "http://18.230.56.189:9999",
  "http://46.19.64.132:97",
  "http://187.120.195.6:43703",
  "http://143.198.114.149:8101",
  "http://60.204.153.176:3010",
  "http://51.250.31.204:8888",
  "http://144.217.7.222:3017",
  "http://51.75.20.232:9090",
  "http://45.238.110.220:8000",
  "http://110.4.41.174:3092",
  "http://104.248.209.146:2000",
  "http://18.230.190.60:9999",
  "http://104.248.98.96:1888",
  "http://54.201.26.174:5002",
  "http://130.193.36.82:8888",
  "http://89.58.17.33:3002",
  "http://139.162.33.188:7001",
  "http://142.132.181.0:8089",
  "http://176.111.61.59:4044",
  "http://118.189.204.126:30080",
  "http://34.127.78.80:9999",
];

const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

type RequestStatus = {
  isLoading: boolean;
  isPending: boolean;
  isFetching: boolean;
};

class LycenRequest {
  private requestInstance: AxiosInstance;
  private status: RequestStatus;
  private rateLimitResetTime: number;

  constructor() {
    this.requestInstance = axios.create();
    this.status = {
      isLoading: false,
      isPending: false,
      isFetching: false,
    };
    this.rateLimitResetTime = 0;

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.requestInstance.interceptors.request.use(async (config) => {
      this.status.isLoading = true;
      this.status.isFetching = true;
      this.status.isPending = false;

      if (Date.now() < this.rateLimitResetTime) {
        await Bun.sleep(this.rateLimitResetTime - Date.now());
      }

      // Choose a random CORS proxy for the request
      const corsProxy = corsProxies[Math.floor(Math.random() * corsProxies.length)];
      config.baseURL = corsProxy;

      config.url =
        corsProxies.length <= 0 ? this.googleTranslateProxyUrl(config.url as string) : config.url;

      config.headers = {
        ...config.headers,
        Origin: "ayoko.fun",
      } as unknown as AxiosRequestHeaders;

      config.headers = {
        ...config.headers,
        "User-Agent": getRandomUserAgent(),
      } as AxiosRequestHeaders;

      return config;
    });

    this.requestInstance.interceptors.response.use(
      (response) => {
        this.updateRateLimit(response);
        this.status.isLoading = false;
        this.status.isFetching = false;
        this.status.isPending = false;
        return response;
      },
      async (error) => {
        if (error.response && error.response.status === 429) {
          this.status.isPending = true;
          const retryAfter = this.rateLimitResetTime - Date.now();
          await Bun.sleep(retryAfter);
          this.status.isPending = false;
          return this.requestInstance(error.config);
        }

        this.status.isLoading = false;
        this.status.isFetching = false;
        throw error;
      },
    );
  }

  // Helper to format the Google Translate proxy URL
  private googleTranslateProxyUrl(originalUrl: string): string {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `http://translate.google.com/translate?sl=ja&tl=en&u=${encodedUrl}`;
  }

  private updateRateLimit(response: AxiosResponse) {
    const reset = response.headers["x-ratelimit-reset"];
    this.rateLimitResetTime = reset ? Number(reset) * 1000 : Date.now();
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.requestInstance.get<T>(url, config);
  }

  public async post<T, K>(
    url: string,
    data?: K,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.requestInstance.post<T>(url, data, config);
  }

  public getStatus(): RequestStatus {
    return this.status;
  }
}

const lycen = new LycenRequest();

export default lycen;
