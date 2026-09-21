import { z } from 'zod';
export const restaurant = { name: 'Shawarmao Na', area: 'Sector 51, Gurugram', address: 'Shop No. 4 & 5, First Floor, Samaspur Village, Sector 51, Gurugram, Haryana 122018', phone: '+918058478730', displayPhone: '+91 80584 78730', hours: '12 PM–5 AM daily' };
export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
export function isOpen(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(date));
  return hour >= 12 || hour < 5;
}
export const states = ['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled','rejected'] as const;
export type Status = typeof states[number];
export const statusLabel: Record<Status,string> = {pending:'Order received',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready',out_for_delivery:'Out for delivery',delivered:'Completed',cancelled:'Cancelled',rejected:'Rejected'};
export function nextStates(status: Status, fulfillment: string): Status[] {
  const next: Record<Status,Status[]> = {pending:['confirmed','rejected','cancelled'],confirmed:['preparing','cancelled'],preparing:['ready','cancelled'],ready:[fulfillment === 'pickup' ? 'delivered' : 'out_for_delivery','cancelled'],out_for_delivery:['delivered','cancelled'],delivered:[],cancelled:[],rejected:[]};
  return next[status];
}
export const orderSchema = z.object({
  idempotencyKey: z.string().uuid(),
  items: z.array(z.object({id:z.string().uuid(),quantity:z.number().int().min(1).max(20)}).strict()).min(1).max(50),
  fulfillment: z.enum(['pickup','delivery']),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  address: z.string().trim().max(500).default(''),
  notes: z.string().trim().max(500).default('')
}).strict().refine(v => v.fulfillment !== 'delivery' || v.address.length >= 10, {message:'Enter a complete delivery address',path:['address']});
export const menuSchema = z.object({
  id:z.string().uuid().optional(), name:z.string().trim().min(2).max(100), description:z.string().trim().max(300), category:z.string().trim().min(2).max(60), pricePaise:z.number().int().min(100).max(1000000), available:z.boolean(), verified:z.boolean(), dietary:z.enum(['veg','non-veg','unspecified']), image:z.string().regex(/^\/images\/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg)$/).or(z.literal(''))
}).strict();
export type MenuItem = z.infer<typeof menuSchema> & {id:string};
export type OrderInput = z.infer<typeof orderSchema>;
export type Order = {id:string; number:string; status:Status; fulfillment:'pickup'|'delivery'; name:string; phone:string; address:string; notes:string; subtotal:number; deliveryFee:number; total:number; paymentStatus:'unpaid'; createdAt:string; items:{id:string;name:string;pricePaise:number;quantity:number}[]; history:{status:Status;at:string}[]};
export type PublicOrder = Omit<Order,'name'|'phone'|'address'|'notes'>;
export class AppError extends Error { constructor(message:string, public status=400) { super(message); } }
export function calculateItems(lines: OrderInput['items'], menu:MenuItem[]) {
  const seen = new Set<string>();
  return lines.map(line => {
    if(seen.has(line.id)) throw new AppError('Duplicate menu item');
    seen.add(line.id);
    const item = menu.find(i=>i.id===line.id);
    if(!item || !item.available || !item.verified) throw new AppError('An item is no longer available. Please review your bag.',409);
    return {id:item.id,name:item.name,pricePaise:item.pricePaise,quantity:line.quantity};
  });
}
