export interface Message {
  _id: string;
  text: string;
  creator: { _id: string; name: string };
  data?: { type?: 'day' | 'night' };
  createdAt: string;
}
