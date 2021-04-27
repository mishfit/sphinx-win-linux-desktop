import { action } from 'mobx'
import { chatStore } from './chats'
import { relay } from '../api'
import {detailsStore} from './details'

export const NUM_SECONDS = 60

type DestinationType = 'wallet' | 'node'
export interface Destination {
  address: string
  split: number
  type: DestinationType
}

export interface StreamPayment {
  feedID: number
  itemID: number
  ts: number
  speed?: string,
  title?: string
  text?: string
  url?: string
  pubkey?: string
  type?: string
  uuid?: string
  amount?: number
}

export interface SendPaymentArgs {
  destinations: Destination[],
  text: string,
  amount: number,
  chat_id: number,
  update_meta: boolean
}

export class FeedStore {

  @action async sendPayments(args: SendPaymentArgs) {
    if(!args) return
    console.log("SENDING PAYMENT TO = ", args.text)
    console.log("AMOUNT === ", args.amount)
    await relay.post('stream', args)
    if(args.chat_id && args.update_meta && args.text) {
      let meta
      try {
        meta = JSON.parse(args.text)
      } catch(e) {}
      if(meta) {
        chatStore.updateChatMeta(args.chat_id, meta)
      }
    }

    if (args.amount) detailsStore.addToBalance(args.amount * -1)
    // asyncForEach(dests, async (d: Destination) => {
    //   const amt = Math.max(Math.round((d.split / 100) * price), 1)
    //   if (d.type === 'node') {
    //     if (!d.address) return
    //     if (d.address === userStore.publicKey) return
    //     if (d.address.length !== 66) return
    //     await msgStore.sendAnonPayment({
    //       dest: d.address, amt, memo,
    //     })
    //   }
    //   if (d.type === 'wallet') {
    //     await msgStore.payInvoice({
    //       payment_request: d.address,
    //       amount: amt
    //     })
    //   }
    // })
  }

  @action
  async loadFeedById(id: string) {
    if (!id) return
    try {
      const r = await fetch(`https://tribes.sphinx.chat/podcast?id=${id}`)
      const j = await r.json()
      return j
    } catch (e) {
      console.log(e)
    }
  }

}

export const feedStore = new FeedStore()

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
