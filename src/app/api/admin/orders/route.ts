import {api,requireAdmin} from '@/lib/http';
import {listOrders} from '@/lib/db';
export async function GET(){return api(async()=>{await requireAdmin();return {orders:listOrders()};});}
