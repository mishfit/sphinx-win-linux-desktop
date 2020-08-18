import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import theme from '../theme'
import SendIcon from '@material-ui/icons/Send';
import IconButton from '@material-ui/core/IconButton';
import BlinkingButton from '@material-ui/core/IconButton';
import MicIcon from '@material-ui/icons/Mic';
import Check from '@material-ui/icons/Check'
import Close from '@material-ui/icons/Close'
import AddCircleButton from '@material-ui/icons/AddCircle';
import { useStores } from '../../src/store'
import { useObserver } from 'mobx-react-lite'
import moment from 'moment'
import { ReactMic } from '@cleandersonlobo/react-mic';

export default function Foot({ height }) {
  const { ui, msg } = useStores()
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const chat = ui.selectedChat
  const [record, setRecord] = useState(false)
  useEffect(() => {
    if(recording){
      setRecord(true)
    }
  }, [recording]) 


  function sendMessage() {
    if (!text) return
    let contact_id = chat.contact_ids.find(cid => cid !== 1)
    msg.sendMessage({
      contact_id,
      text,
      chat_id: chat.id || null,
      amount: 0,
      reply_uuid: ''
    })
    setText('')
  }

  let [count, setCount] = useState(0);

  useInterval(() => {
    // Your custom logic here
    setCount(count + 1);
  }, recording ? 1000 : null);

  function duration(seconds) {
    var start = moment(0)
    var end = moment(seconds * 1000)
    let diff = end.diff(start);
    return moment.utc(diff).format("m:ss");
  }

  function onStop(blob){
    console.log('Blob is:', blob)
    setRecording(false)
    setCount(0)
  }

  return useObserver(() => {

    if (recording) {

      return <MicWrap style={{ background: theme.bg, height }}>
        <Blinker>
          <BlinkingButton style={{ height: 10, padding: 7, backgroundColor: '#ea7574', marginTop: -1}} />
        </Blinker>
        <WaveWrap>
                  <ReactMic
                className="sound-wave"
                record={record}
                backgroundColor={theme.bg}
                onStop={onStop}
                //onStart={onStart}
                strokeColor="#ffffff"
            />
        </WaveWrap>
        <div style={{ color: 'white', height: 25, marginTop: 8, marginRight: 10 }}>
          {duration(count)}
        </div>
        <IconButton style={{ width: 39, height: 39, marginRight: 17, backgroundColor: '#ea7574' }}
          onClick={() => {setRecord(false), setRecording(false), setCount(0)}}>
          <Close style={{ color: 'white', fontSize: 30, borderRadius: "50%" }} />
        </IconButton>
        <IconButton style={{ width: 39, height: 39, marginRight: 17, backgroundColor: '#47ca97' }}
          onClick={() => setRecord(false)}>
          <Check style={{ color: 'white', fontSize: 30, borderRadius: "50%" }} />
        </IconButton>
      </MicWrap>
    }


    return <Wrap style={{ background: theme.bg, height }}>
      <AddCircleButton />
      <Input value={text} onChange={e => setText(e.target.value)}
        placeholder="Message" style={{ background: theme.extraDeep }}
        disabled={!chat}
        onKeyPress={e => {
          if (e.key === 'Enter') sendMessage()
        }}
      />
      <IconButton style={{
        background: chat ? theme.primary : theme.extraDeep, width: 39, height: 39, marginRight: 10, marginLeft: 10,
        backgroundColor: '#618af8'
      }} disabled={!chat || !text} onClick={sendMessage}>
        <SendIcon style={{ color: 'white', fontSize: 22 }} />
      </IconButton>
      <IconButton style={{
        width: 39, height: 39, marginRight: 10,
        backgroundColor: 'transparent'
      }} /*disabled={!chat}*/ onClick={() => setRecording(true)}>
        <MicIcon style={{ color: '#8f9ca9', fontSize: 30 }} />
      </IconButton>
    </Wrap>
  })
}



const Blinker = styled.div`
  animation:blink 1.2s infinite;

@keyframes blink {
  from, to { opacity: 1 }
  50% { opacity: 0 }
}
`

const MicWrap = styled.div`
  width:100%;
  display:flex;
  flex-direction:row;
  align-items:center;
  justify-content:flex-end;
  box-shadow: 0px 0px 6px 0px rgba(0,0,0,0.45);

  & .sound-wave{
    margin-top: 5px;
    clip-path: inset(20px 0px 0px 40px);
  }
`

const WaveWrap = styled.div`
 margin-right: 5px;
 margin-left: -35px;
 max-width: 150px;
 overflow: hidden;
`

const Wrap = styled.div`
  width:100%;
  display:flex;
  flex-direction:row;
  align-items:center;
  justify-content:space-between;
  box-shadow: 0px 0px 6px 0px rgba(0,0,0,0.45);
`
const Input = styled.input`
  max-width:calc(100% - 64px);
  width:100%;
  height:42px;
  border:none;
  outline:none;
  border-radius:32px;
  font-size:14px;
  padding-left:24px;
  padding-right:24px;
  color:white;
  margin-left:8px;
`
function useInterval(callback, delay) {
  const savedCallback: any = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
