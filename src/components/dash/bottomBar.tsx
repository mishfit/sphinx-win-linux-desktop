import React, {useState} from 'react'
import {useObserver} from 'mobx-react-lite'
import {useStores,useTheme} from '../../store'
import {View,StyleSheet} from 'react-native'
import {IconButton, Portal} from 'react-native-paper'
import QR from '../utils/qr'
import * as ln from '../utils/decode'
import * as utils from '../utils/utils'
import {qrActions} from '../../qrActions'

export default function BottomTabs() {
  const {ui,chats} = useStores()
  const [scanning, setScanning] = useState(false)
  const theme = useTheme()
  return useObserver(()=>
    <View style={{...styles.bar,
      backgroundColor:theme.main,
      borderColor:theme.bg
    }}>
      <IconButton icon="arrow-bottom-left" size={32} color={theme.title}
        onPress={()=> ui.setPayMode('invoice', null)}  // chat here   
      />
      <IconButton icon="format-list-bulleted" size={29} color={theme.title}
        onPress={()=> ui.setPaymentHistory(true)} 
      />
      <IconButton icon="qrcode-scan" size={25} color={theme.title}
        onPress={()=> setScanning(true)} // after scan, set {amount,payment_request}
      />
      <IconButton icon="arrow-top-right" size={32} color={theme.title}
        onPress={()=> ui.setPayMode('payment', null)}  // chat here   
      />

      <Portal>
        <View style={styles.qrWrap}>
          {scanning && <QR
            showPaster
            onCancel={()=>setScanning(false)}
            onScan={async data=>{
              console.log(data)
              if(isLN(data)) {
                let inv:any
                let theData = data
                if(data.indexOf(':')>=0){ // some are like "lightning:ln....""
                  theData = data.split(':')[1]
                }
                try{inv = ln.decode(theData.toLowerCase())} catch(e){}
                if(!(inv&&inv.human_readable_part))return
                const millisats = inv.human_readable_part.amount
                const sats = millisats && Math.round(millisats/1000)
                ui.setConfirmInvoiceMsg({payment_request:theData,amount:sats})
                setTimeout(()=>{
                  setScanning(false)
                },1500)
              } else if(data.startsWith('sphinx.chat://')) {
                const j = utils.jsonFromUrl(data)
                await qrActions(j, ui, chats)
                setTimeout(()=>{
                  setScanning(false)
                },150)
              } else if(data.startsWith('action=donation')) { // this should be already
                const nd = 'sphinx.chat://?'+data
                const j = utils.jsonFromUrl(nd)
                await qrActions(j, ui, chats)
                setTimeout(()=>{
                  setScanning(false)
                },150)
              }
            }}
          />}
        </View>
      </Portal>
    </View>
  )
}

const lnPrefixes = ['ln','LIGHTNING:ln']
function isLN(s){
  const ok = lnPrefixes.find(p=>s.toLowerCase().startsWith(p.toLowerCase()))
  return ok?true:false
}

const styles=StyleSheet.create({
  bar:{
    flex:1,
    width:'100%',
    maxWidth:'100%',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-around',
    height:60,
    maxHeight:60,
    minHeight:60,
    elevation:5,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  img:{
    width:40,height:40,
    borderRadius:20,
    borderColor:'#ccc',
    borderWidth:1,
    backgroundColor:'whitesmoke',
    marginRight:8,
    display:'flex',
    alignItems:'center',
    justifyContent:'center'
  },
  qrWrap:{
    flex:1,
    marginTop:2,
  }
})
