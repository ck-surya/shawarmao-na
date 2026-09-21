import {api,body,checkOrigin} from '@/lib/http';
import {createOrder,rateLimit} from '@/lib/db';
import {orderSchema} from '@/lib/domain';
export async function POST(req:Request){return api(async()=>{checkOrigin(req);rateLimit('orders',60,60000);return createOrder(orderSchema.parse(await body(req)));});}
