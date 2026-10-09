import { PrintJobGrpcClient } from "./grpc.client.js";

const client = new PrintJobGrpcClient("localhost:50051");

const result = await client.getPaymentDetails("6ac7b004acec0aa3a459b986");

console.log(result);
