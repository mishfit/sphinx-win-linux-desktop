import {useState} from 'react'
import {useStores} from '../../../src/store'
import * as aes from '../../crypto/aes'

export function useCachedEncryptedFile(props, ldat){
  const {meme} = useStores()
  const {id, media_key, media_type, media_token} = props

  const [data, setData] = useState('')
  const [loading, setLoading] = useState(false)
  const [paidMessageText, setPaidMessageText] = useState(null)
  const isPaidMessage = media_type==='text/plain'

  async function trigger(){
    if(loading||data||paidMessageText) return // already done
    if(!(ldat&&ldat.host)) {
      return
    }
    if(!ldat.sig || !media_key){
      return
    }

    const url = `https://${ldat.host}/file/${media_token}`
    const server = meme.servers.find(s=> s.host===ldat.host)

    setLoading(true)

    // check if cached
    if(meme.checkCacheEnabled) {
      const dat = meme.cache[ldat.muid]
      if(dat) {
        if(isPaidMessage) setPaidMessageText(dat)
        else setData(dat)
        setLoading(false)
        return // load from cache!
      }
    }

    if(!server) return
    try {
      const r = await fetch(url, {
        headers: {Authorization: `Bearer ${server.token}`}
      })
      const blob = await r.blob() // need to do "text" for paid msg???
      let reader = new FileReader();
      reader.onload = async function(){ // file content
        const res = String(reader.result)
        if(res.length===0) {
          setLoading(false)
          return // failed somehow
        }
        const idx = res.indexOf(',')
        const b64 = res.substring(idx+1)
        let dat = ''
        if(isPaidMessage) {
          const dec = await aes.decrypt(b64, media_key)
          if(dec) {
            setPaidMessageText(dec)
            meme.addToCache(ldat.muid, String(dec))
          }
        } else {
          console.log("DECRYPT NOW!!!!",media_type)
          const dec = await aes.decrypt64(b64, media_key)
          if(dec) {
            let mime = media_type
            if(mime==='audio/m4a') mime='audio/wav'
            setData(`data:${mime};base64,${dec}`)
            meme.addToCache(ldat.muid, `data:${mime};base64,${dec}`)
          }         
        }
        setLoading(false)
      }
      reader.readAsDataURL(blob);
    } catch(e) {
      console.log(e)
    }
  }

  return {data, loading, trigger, paidMessageText}
}