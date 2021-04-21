import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, Image, Alert } from 'react-native'
import { useStores, useTheme } from '../../../store'
import shared from './sharedStyles'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useCachedEncryptedFile } from './hooks'
import { ActivityIndicator, Button, IconButton } from 'react-native-paper'
import AudioPlayer from './audioPlayer'
import { parseLDAT } from '../../utils/ldat'
import Video from 'react-native-video';
import FileMsg from './fileMsg'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import BoostRow from './boostRow'

export default function MediaMsg(props) {
  const { meme, ui, msg } = useStores()
  const theme = useTheme()
  const [buying, setBuying] = useState(false)
  const { message_content, media_type, chat, media_token } = props
  const isMe = props.sender === props.myid

  const ldat = parseLDAT(media_token)

  let amt = null
  let purchased = false
  if (ldat.meta && ldat.meta.amt) {
    amt = ldat.meta.amt
    if (ldat.sig) purchased = true
  }
  const { data, uri, loading, trigger, paidMessageText } = useCachedEncryptedFile(props, ldat)

  // useEffect(() => {
  //   if (props.viewable) trigger()
  // }, [props.viewable, props.media_token]) // refresh when scroll, or when purchase accepted

  useEffect(() => {
    trigger()
  }, [props.media_token]) // refresh when scroll, or when purchase accepted

  async function buy(amount) {
    setBuying(true)
    let contact_id = props.sender
    if (!contact_id) {
      contact_id = chat.contact_ids && chat.contact_ids.find(cid => cid !== props.myid)
    }
    await msg.purchaseMedia({
      chat_id: chat.id,
      media_token,
      amount,
      contact_id,
    })
    setBuying(false)
  }

  function showTooltip() {
    console.log("TOOLTIP")
  }
  function press() {
    if (media_type.startsWith('image')) {
      if (data) ui.setImgViewerParams({ data })
      if (uri) ui.setImgViewerParams({ uri })
    }
  }
  function longPress() {
    console.log('longpress')
  }

  const hasImgData = (data || uri) ? true : false
  const hasContent = message_content ? true : false
  const showPurchaseButton = amt && !isMe ? true : false
  const showStats = isMe && amt
  const sold = props.sold

  const showBoostRow = props.boosts_total_sats?true:false

  let isImg = false
  let minHeight = 60
  let showPayToUnlockMessage = false
  if (media_type === 'sphinx/text') {
    minHeight = isMe ? 72 : 42
    if (!isMe && !loading && !paidMessageText) showPayToUnlockMessage = true
  }
  if (media_type.startsWith('audio')) {
    minHeight = 50
  }
  if (media_type.startsWith('image') || media_type.startsWith('video')) {
    minHeight = 200
    isImg = true
  }

  let wrapHeight = minHeight
  if (showPurchaseButton) wrapHeight += 38

  const onButtonPressHandler = () => {
    if (!purchased) buy(amt)
  }

  const onLongPressHandler = () => props.onLongPress(props)


  const confirmButton = () =>
    Alert.alert(
      "Confirm Purchase",
      "Confirm Purchase?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        { text: "Confirm", onPress: () => onButtonPressHandler() }
      ]
    );

  return <View collapsable={false}>
    <TouchableOpacity style={{ ...styles.wrap, minHeight: wrapHeight }}
      //onPressIn={tap} onPressOut={untap}
      onLongPress={onLongPressHandler}
      onPress={press}
      activeOpacity={0.65}>

      {showStats && <View style={styles.stats}>
        <Text style={styles.satStats}>{`${amt} sat`}</Text>
        <Text style={{ ...styles.satStats, opacity: sold ? 1 : 0 }}>Purchased</Text>
      </View>}

      {!hasImgData && <View style={{ minHeight, ...styles.loading }}>
        {loading && <View style={{ minHeight, ...styles.loadingWrap }}>
          <ActivityIndicator animating={true} color="grey" />
        </View>}
        {paidMessageText && <View style={{ minHeight, ...styles.paidAttachmentText }}>
          <Text style={{color:theme.title}}>{paidMessageText}</Text>
        </View>}
        {showPayToUnlockMessage && <View style={{ ...styles.paidAttachmentText, alignItems: 'center' }}>
          <Text style={{...styles.payToUnlockMessage,color:theme.subtitle}}>
            Pay to unlock message
          </Text>
        </View>}
      </View>}

      {hasImgData && <Media type={media_type} data={data} uri={uri} 
        filename={meme.filenameCache[props.id]}
      />}

      {isImg && (showPurchaseButton&&!purchased) && <View style={styles.imgIconWrap}>
        <Icon name="image" color="grey" size={50} />
      </View>}

      {hasContent && <View style={shared.innerPad}>
        <Text style={{...styles.text,color:theme.title}}>{message_content}</Text>
      </View>}

      {showBoostRow && <BoostRow {...props} pad myAlias={props.myAlias}/>}

      {showPurchaseButton && <Button style={styles.payButton} mode="contained" dark={true}
        onPress={confirmButton}
        loading={buying}
        icon={purchased ? 'check' : 'arrow-top-right'}>
        <Text style={{ fontSize: 11 }}>
          {purchased ? 'Purchased' : `Pay ${amt} sat`}
        </Text>
      </Button>}

    </TouchableOpacity>
  </View>
}

function Media({ type, data, uri, filename }) {
  // console.log("MEDIA:",type,uri)
  if (type === 'sphinx/text') return <></>
  if (type.startsWith('image')) {
    return <Image style={styles.img} resizeMode='cover' source={{ uri: uri || data }} />
  }
  if (type.startsWith('audio')) {
    return <AudioPlayer source={uri || data} />
  }
  if (type.startsWith('video') && uri) {
    return <VideoPlayer uri={{ uri }} />
  }
  return <FileMsg type={type} uri={uri} filename={filename} />
}

function VideoPlayer(props){
  const { ui } = useStores()
  function onEnd() {
    
  }
  function onPlay(){
    ui.setVidViewerParams(props)
  }
  return <>
    <Video source={props.uri} resizeMode="cover"
      paused={true} onEnd={onEnd} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        zIndex:100,
      }}
    />
    <IconButton icon="play" size={55} color="white" 
      style={{position:'absolute',top:50,left:50,zIndex:101}} 
      onPress={onPlay}
    />
  </>
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
  },
  wrap: {
    // flex:1,
    width: 200,
    // minHeight:200,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  img: {
    width: 200,
    height: 200
  },
  payButton: {
    backgroundColor: '#4AC998',
    width: '100%',
    borderRadius: 5,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // position:'absolute',
    // bottom:0,
  },
  stats: {
    position: 'absolute',
    width: '100%',
    top: 0, left: 0, right: 0,
    display: 'flex',
    flexDirection: 'row',
    padding: 7,
    justifyContent: 'space-between',
  },
  satStats: {
    color: 'white',
    backgroundColor: '#55D1A9',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
    paddingBottom: 2,
    position: 'relative',
    zIndex: 9,
    fontSize: 12,
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  paidAttachmentText: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingLeft: 10,
    paddingBottom: 13,
    paddingTop: 13,
  },
  payToUnlockMessage: {
    fontSize: 12,
    fontWeight: 'bold',
    minHeight: 18
  },
  loading: {
    width: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  imgIconWrap:{
    position:'absolute',
    width:'100%',
    top:80,
    display:'flex',
    alignItems:'center',
    justifyContent:'center'
  }
})
