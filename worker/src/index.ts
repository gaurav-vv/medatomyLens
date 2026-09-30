import { handleRequest, type Env } from "./handler";

const worker = {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

export default worker;
