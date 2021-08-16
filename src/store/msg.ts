import { observable, action } from "mobx";
import { relay } from "../api";
import { chatStore, Chat } from "./chats";
import { userStore } from "./user";
import { detailsStore } from "./details";
import { constants } from "../constants";
import { persist } from "mobx-persist";
import moment from "moment";
import {
  encryptText,
  makeRemoteTextMap,
  decodeSingle,
  decodeMessages,
  orgMsgsFromExisting,
  orgMsgs,
  putIn,
  putInReverse,
} from "./msgHelpers";
import { persistMsgLocalForage } from "./storage";

const DAYS = 7;
export const MAX_MSGS_PER_CHAT = 1000;
export const MAX_MSGS_RESTORE = 50000;

export interface Msg {
  id: number;
  chat_id: number;
  type: number;
  uuid: string;
  sender: number;
  receiver: number;
  amount: number;
  amount_msat: number;
  payment_hash: string;
  payment_request: string;
  date: string;
  expiration_date: string;
  message_content: string;
  remote_message_content: string;
  status: number;
  status_map: { [k: number]: number };
  parent_id: number;
  subscription_id: number;
  media_type: string;
  media_token: string;
  media_key: string;
  seen: boolean;
  created_at: string;
  updated_at: string;
  sender_alias: string;
  sender_pic: string;

  original_muid: string;
  reply_uuid: string;

  text: string;

  chat: Chat;

  sold: boolean; // this is a marker to tell if a media has been sold
  showInfoBar: boolean; // marks whether to show the date and name

  reply_message_content: string;
  reply_message_sender_alias: string;
  reply_message_sender: number;

  boosts_total_sats: number;
  boosts: BoostMsg[];
}

export interface BoostMsg {
  amount: number;
  date: string;
  sender_alias: string;
}

class MsgStore {
  @persist("object")
  @observable // chat id: message array
  messages: { [k: number]: Msg[] } = {};

  @persist("object")
  @observable
  lastSeen: { [k: number]: number } = {}; // {chat_id: new Date().getTime()}

  @persist
  @observable
  lastFetched: number;

  @action clearAllMessages() {
    this.messages = {};
  }

  @action reset() {
    this.messages = {};
    this.lastSeen = {};
    this.lastFetched = 0;
  }

  // @action
  // async getAllMessages() {
  //   try {
  //     const r = await relay.get('messages')
  //     if (!r) return
  //     const msgs = await decodeMessages(r.new_messages)
  //     this.messages = orgMsgs(msgs)
  //     this.lastFetched = new Date().getTime()
  //   } catch (e) {
  //     console.log(e)
  //   }
  // }

  @action persister() {
    persistMsgLocalForage(this);
  }

  @action lengthOfAllMessages() {
    let l = 0;
    Object.values(this.messages).forEach((msgs) => {
      l += msgs.length;
    });
    return l;
  }

  @action async restoreMessages() {
    console.log("=> restoreMessages");
    let done = false;
    let offset = 0;
    const dateq = moment.utc(0).format("YYYY-MM-DD%20HH:mm:ss");
    let msgs: { [k: number]: Msg[] } = ({} = {});
    while (!done) {
      const r = await relay.get(
        `msgs?limit=200&offset=${offset}&date=${dateq}`
      );
      if (r && r.new_messages && r.new_messages.length) {
        const decodedMsgs = await decodeMessages(r.new_messages);
        msgs = orgMsgsFromExisting(msgs, decodedMsgs);
        if (r.new_messages.length < 200) {
          console.log("=> restore, done = true 1");
          done = true;
        }
      } else {
        console.log("=> restore, done = true 2");
        done = true;
      }
      offset += 200;
      console.log("=> restore offset", offset);
      if (offset >= MAX_MSGS_RESTORE) done = true; // force finish after 5k
    }
    console.log("RESTORE DONE!");
    this.sortAllMsgs(msgs);
    this.lastFetched = new Date().getTime();
    this.persister();
  }

  @action
  async getMessages(forceMore?: boolean) {
    const len = this.lengthOfAllMessages();
    if (len === 0) {
      return this.restoreMessages();
    }
    console.log("=> GET MESSAGES: forceMore?", forceMore);
    let route = "messages";
    if (!forceMore && this.lastFetched) {
      const mult = 1;
      const dateq = moment
        .utc(this.lastFetched - 1000 * mult)
        .format("YYYY-MM-DD%20HH:mm:ss");
      route += `?date=${dateq}`;
    } else {
      // else just get last week
      console.log("=> GET LAST WEEK");
      const start = moment()
        .subtract(DAYS, "days")
        .format("YYYY-MM-DD%20HH:mm:ss");
      route += `?date=${start}`;
    }
    try {
      const r = await relay.get(route);
      if (!r) return;
      console.log(
        "=> NEW MSGS LENGTH",
        r.new_messages && r.new_messages.length
      );
      if (r.new_messages && r.new_messages.length) {
        await this.batchDecodeMessages(r.new_messages);
      } else {
        this.sortAllMsgs(null);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async batchDecodeMessages(msgs: Msg[]) {
    this.lastFetched = new Date().getTime();
    const first10 = msgs.slice(msgs.length - 10);
    const rest = msgs.slice(0, msgs.length - 10);
    const decodedMsgs = await decodeMessages(first10);
    this.messages = orgMsgsFromExisting(this.messages, decodedMsgs);
    console.log("OK! FIRST 10!");

    this.reverseDecodeMessages(rest.reverse());
  }

  // push it in reverse, to show latest at first, then put in older ones
  async reverseDecodeMessages(msgs: Msg[]) {
    const decoded = await decodeMessages(msgs);
    const allms: { [k: number]: Msg[] } = JSON.parse(
      JSON.stringify(this.messages)
    );
    putInReverse(allms, decoded);
    this.sortAllMsgs(allms);
    console.log("NOW ALL ARE DONE!");
    this.persister();
  }

  sortAllMsgs(allms: { [k: number]: Msg[] }) {
    const final = {};
    let toSort: { [k: number]: Msg[] } =
      allms || JSON.parse(JSON.stringify(this.messages));
    Object.entries(toSort).forEach((entries) => {
      const k = entries[0];
      const v: Msg[] = entries[1];
      v.sort((a, b) => moment(b.date).unix() - moment(a.date).unix());
      final[k] = v;
    });
    this.messages = final;
  }

  async messagePosted(m) {
    let newMsg = await decodeSingle(m);
    if (newMsg.chat_id) {
      const idx = this.messages[newMsg.chat_id].findIndex((m) => m.id === -1);
      if (idx > -1) {
        this.messages[newMsg.chat_id][idx] = {
          ...m,
          // add alias?
          status: this.messages[newMsg.chat_id][idx].status,
        };
        this.persister();
      }
    }
  }

  @action
  async invoicePaid(m) {
    if (m.chat_id) {
      const msgs = this.messages[m.chat_id];
      if (msgs) {
        const invoice = msgs.find((c) => c.payment_hash === m.payment_hash);
        if (invoice) {
          invoice.status = constants.statuses.confirmed;
          this.persister();
        }
      }
    }
    if (m.amount) detailsStore.addToBalance(m.amount * -1);
  }

  @action
  async sendMessage({
    contact_id,
    text,
    chat_id,
    amount,
    reply_uuid,
    boost,
    message_price,
  }: {
    contact_id: number | null;
    text: string;
    chat_id: number | null;
    amount: number;
    reply_uuid: string;
    boost?: boolean;
    message_price?: number;
  }) {
    try {
      const myid = userStore.myid;
      const encryptedText = await encryptText({ contact_id: myid, text });
      const remote_text_map = await makeRemoteTextMap({
        contact_id,
        text,
        chat_id,
      });
      const v: { [k: string]: any } = {
        contact_id,
        chat_id: chat_id || null,
        text: encryptedText,
        remote_text_map,
        amount: amount || 0,
        reply_uuid,
        boost: boost || false,
      };
      if (message_price) v.message_price = message_price;
      // const r = await relay.post('messages', v)
      // this.gotNewMessage(r)
      if (!chat_id) {
        const r = await relay.post("messages", v);
        if (!r) return;
        this.gotNewMessage(r);
        return r;
      } else {
        const putInMsgType = boost
          ? constants.message_types.boost
          : constants.message_types.message;
        const amt =
          boost && message_price && message_price < amount
            ? amount - message_price
            : amount;
        putIn(
          this.messages,
          {
            ...v,
            id: -1,
            sender: myid,
            amount: amt,
            date: moment().toISOString(),
            type: putInMsgType,
            message_content: text,
          },
          chat_id
        );
        const r = await relay.post("messages", v);
        if (!r) return;
        // console.log("RESULT")
        this.messagePosted(r);
        if (amount) detailsStore.addToBalance(amount * -1);
        return r;
      }
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async sendAttachment({
    contact_id,
    text,
    chat_id,
    muid,
    media_type,
    media_key,
    price,
    amount,
  }) {
    try {
      const media_key_map = await makeRemoteTextMap(
        { contact_id, text: media_key, chat_id },
        true
      );
      const v: { [k: string]: any } = {
        contact_id,
        chat_id: chat_id || null,
        muid,
        media_type,
        media_key_map,
        amount: amount || 0,
      };
      if (price) v.price = price;
      if (text) {
        const myid = userStore.myid;
        const encryptedText = await encryptText({ contact_id: myid, text });
        const remote_text_map = await makeRemoteTextMap({
          contact_id,
          text,
          chat_id,
        });
        v.text = encryptedText;
        v.remote_text_map = remote_text_map;
      }
      // return
      const r = await relay.post("attachment", v);
      if (!r) return;
      this.gotNewMessage(r);
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async setMessageAsReceived(m) {
    if (!m.chat_id) return;
    const msgsForChat = this.messages[m.chat_id];
    const ogMessage =
      msgsForChat &&
      msgsForChat.find((msg) => msg.id === m.id || msg.id === -1);
    if (ogMessage) {
      ogMessage.status = constants.statuses.received;
    } else {
      // add anyway (for on another app)
      this.gotNewMessage(m);
    }
  }

  @action
  async sendPayment({ contact_id, amt, chat_id, destination_key, memo }) {
    try {
      const myid = userStore.myid;
      const myenc = await encryptText({ contact_id: myid, text: memo });
      const encMemo = await encryptText({ contact_id, text: memo });
      const v = {
        contact_id: contact_id || null,
        chat_id: chat_id || null,
        amount: amt,
        destination_key,
        text: myenc,
        remote_text: encMemo,
      };
      const r = await relay.post("payment", v);
      if (!r) return;
      if (contact_id || chat_id) this.gotNewMessage(r);
      if (r.amount) detailsStore.addToBalance(r.amount * -1);
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async sendAnonPayment({ amt, dest, memo }) {
    try {
      const v = {
        amount: amt,
        destination_key: dest,
        text: memo,
      };
      const r = await relay.post("payment", v);
      if (!r) return;
      if (r.amount) detailsStore.addToBalance(r.amount * -1);
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async purchaseMedia({ contact_id, amount, chat_id, media_token }) {
    try {
      const v = {
        contact_id: contact_id || null,
        chat_id: chat_id || null,
        amount: amount,
        media_token: media_token,
      };
      const r = await relay.post("purchase", v);
      console.log(r);
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async sendInvoice({ contact_id, amt, chat_id, memo }) {
    try {
      const myid = userStore.myid;
      const myenc = await encryptText({ contact_id: myid, text: memo });
      const encMemo = await encryptText({ contact_id, text: memo });
      const v = {
        contact_id,
        chat_id: chat_id || null,
        amount: amt,
        memo: myenc,
        remote_memo: encMemo,
      };
      const r = await relay.post("invoices", v); // raw invoice:
      if (!r) return;
      this.gotNewMessage(r);
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async createRawInvoice({ amt, memo }) {
    try {
      const v = { amount: amt, memo };
      const r = await relay.post("invoices", v);
      return r;
      // r = {invoice: payment_request}
    } catch (e) {
      console.log(e);
    }
  }

  @action
  filterMessagesByContent(chatID, filterString) {
    const list = this.messages[chatID];
    if (!list) return [];
    return list.filter((m) => m.message_content.includes(filterString));
  }

  @action
  async payInvoice({ payment_request, amount }) {
    try {
      const v = { payment_request };
      const r = await relay.put("invoices", v);
      if (!r) return;
      this.invoicePaid({ ...r, amount });
    } catch (e) {
      console.log(e);
    }
  }

  @action
  async deleteMessage(id) {
    if (!id) return console.log("NO ID!");
    const r = await relay.del(`message/${id}`);
    if (!r) return;
    if (r.chat_id) {
      putIn(this.messages, r, r.chat_id);
      this.persister();
    }
  }

  @action
  seeChat(id) {
    if (!id) return;
    this.lastSeen[id] = new Date().getTime();
    relay.post(`messages/${id}/read`);
    this.persister();
  }

  @action
  countUnseenMessages(myid: number): number {
    const now = new Date().getTime();
    let unseenCount = 0;
    const lastSeenObj = this.lastSeen;
    Object.entries(this.messages).forEach(function ([id, msgs]) {
      const lastSeen = lastSeenObj[id || "_"] || now;
      msgs.forEach((m) => {
        if (m.sender !== myid) {
          const unseen = moment(new Date(lastSeen)).isBefore(moment(m.date));
          if (unseen) unseenCount += 1;
        }
      });
    });
    return unseenCount;
  }

  @action
  initLastSeen() {
    const obj = this.lastSeen ? JSON.parse(JSON.stringify(this.lastSeen)) : {};
    chatStore.chats.forEach((c) => {
      if (!obj[c.id]) obj[c.id] = new Date().getTime();
    });
    this.lastSeen = obj;
  }

  @action
  async approveOrRejectMember(contactID, status, msgId) {
    const r = await relay.put(`member/${contactID}/${status}/${msgId}`);
    if (r && r.chat && r.chat.id) {
      const msgs = this.messages[r.chat.id];
      const msg = msgs.find((m) => m.id === msgId);
      if (msg) {
        msg.type = r.message.type;
        this.persister();
      }
      // update chat
      chatStore.gotChat(r.chat);
    }
  }

  @action // only if it contains a "chat"
  async gotNewMessage(m) {
    let newMsg = await decodeSingle(m);
    const chatID = newMsg.chat_id;
    if (chatID) {
      putIn(this.messages, newMsg, chatID);
      this.persister();
      if (newMsg.chat) chatStore.gotChat(newMsg.chat);
    }
  }

  @action // only if it contains a "chat"
  async gotNewMessageFromWS(m) {
    let newMsg = await decodeSingle(m);
    const chatID = newMsg.chat_id;
    if (chatID || chatID === 0) {
      msgsBuffer.push(newMsg);
      if (msgsBuffer.length === 1) {
        this.pushFirstFromBuffer();
      }
      debounce(() => {
        this.concatNewMsgs();
      }, 1000);
      // if(newMsg.chat) chatStore.gotChat(newMsg.chat) // IS THIS NEEDED????
    }
  }

  @action concatNewMsgs() {
    const msgs = JSON.parse(JSON.stringify(msgsBuffer));
    msgs.sort((a, b) => moment(a.date).unix() - moment(b.date).unix());
    this.messages = orgMsgsFromExisting(this.messages, msgs);
    msgsBuffer = [];
    this.persister();
  }

  @action pushFirstFromBuffer() {
    const msg = msgsBuffer[0];
    const msgs = [msg];
    this.messages = orgMsgsFromExisting(this.messages, msgs);
  }
}

export const msgStore = new MsgStore();

function rando() {
  return Math.random().toString(12).substring(0);
}

let inDebounce;
function debounce(func, delay) {
  const context = this;
  const args = arguments;
  clearTimeout(inDebounce);
  inDebounce = setTimeout(() => func.apply(context, args), delay);
}

let msgsBuffer = [];

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
