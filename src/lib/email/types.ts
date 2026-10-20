/** Subset of the Postmark inbound webhook JSON we rely on. */
export interface PostmarkAddress {
  Email: string;
  Name?: string;
  MailboxHash?: string;
}

export interface PostmarkHeader {
  Name: string;
  Value: string;
}

export interface PostmarkAttachment {
  Name: string;
  Content: string; // base64
  ContentType: string;
  ContentLength?: number;
  ContentID?: string;
}

export interface PostmarkInboundPayload {
  MessageID: string;
  From: string;
  FromName?: string;
  FromFull?: PostmarkAddress;
  To?: string;
  ToFull?: PostmarkAddress[];
  CcFull?: PostmarkAddress[];
  OriginalRecipient?: string;
  ReplyTo?: string;
  Subject?: string;
  Date?: string;
  MailboxHash?: string;
  TextBody?: string;
  HtmlBody?: string;
  StrippedTextReply?: string;
  Headers?: PostmarkHeader[];
  Attachments?: PostmarkAttachment[];
}

export function getHeader(headers: PostmarkHeader[] | undefined, name: string): string | undefined {
  const n = name.toLowerCase();
  return headers?.find((h) => h.Name.toLowerCase() === n)?.Value;
}

export function getHeaders(headers: PostmarkHeader[] | undefined, name: string): string[] {
  const n = name.toLowerCase();
  return (headers ?? []).filter((h) => h.Name.toLowerCase() === n).map((h) => h.Value);
}

export interface OutgoingEmail {
  kind: string;
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  stream?: string;
  pitchId?: string | null;
  execId?: string | null;
}
