import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Head from "./head";
import Foot from "./foot";
import theme from "../theme";
import Msg from "./msg";
import { constants } from "../../src/constants";
import { useStores, hooks } from "../../src/store";
import { useObserver } from "mobx-react-lite";
import Frame from "./frame";
import { CircularProgress } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import Dropzone from "react-dropzone";
import { uploadFile } from "../utils/meme";
import Bots from "./bots";
import MsgMenu from "./msgMenu";
import { useHasReplyContent } from "../../src/store/hooks/chat";
import { useMsgSender } from "../../src/store/hooks/msg";
import Pod from "./pod";
import { StreamPayment } from "../../src/store/feed";
import Anim from "./anim";
const { useMsgs } = hooks;

const headHeight = 65;

export type RouteStatus = "active" | "inactive" | null;

function Chat() {
  const { chats, ui, msg, details, user } = useStores();
  const [appMode, setAppMode] = useState(true);
  const [status, setStatus] = useState<RouteStatus>(null);
  const [tribeParams, setTribeParams] = useState(null);
  const [msgPrice, setMsgPrice] = useState("");
  let footHeight = 65;

  // function joinEvanTest(){
  //   chats.joinTribe({
  //     name:'Evan Test',
  //     uuid:'XyyNsiAM4pbbX4vjtYz2kcFye-h4dd9Nd2twi2Az8gGDQdIbM3HU1WV3XoASXLedCaVpl0YrAvjvBpAPt9ZB0-rpV4Y1',
  //     group_key:'MIIBCgKCAQEA8oGCKreUM09hDXKDoe3laNZY9fzyNMUUZMt+yC5WhoUIzvW1PtRJ6AWH+xwAK3nD+sUK8LP6y9nNSK1z5SNvFem0fmEq1JBPGEUMlqIA4CUeCbJB7cUan1s4DWDosEQBY/fiQNslNKWko97dEyjGEEi0KJkE2kNTgsmpEPfH4+V886Ei4/NP7qTR/3H4ohC5MlUiXyv/Ah1GuhmAM8Hu57fdVe26AJ1jXFkMikC/+84ysseycoQZmCLDvLd6R0nnQ/LOafV2vCC36HChSzylU7qkFHkdbUg6GXO0nxk6dzGFrJpjppJzhrRxmfrL+9RcsuMXkDAQFUZg8wAipPXmrwIDAQAB',
  //     host:'tribes.sphinx.chat',
  //     amount:10,
  //     img:'',
  //     owner_alias:'Evan',
  //     owner_pubkey:'02290714deafd0cb33d2be3b634fc977a98a9c9fa1dd6c53cf17d99b350c08c67b',
  //     is_private:true,
  //   })
  // }

  return useObserver(() => {
    if (useHasReplyContent()) footHeight = 120;
    const chat = ui.selectedChat;

    // console.log("CHAT",chat)

    // this the boost MESSAGE (doesnt actually include the boost amount),
    // the actual boost amount is sent by feed.sendPayments by the podcast XML
    function onBoostPod(sp: StreamPayment) {
      if (!(chat && chat.id)) return;
      msg.sendMessage({
        contact_id: null,
        text: `${JSON.stringify(sp)}`,
        chat_id: chat.id || null,
        amount: messagePrice,
        reply_uuid: "", // not replying
        boost: true,
      });
    }

    useEffect(() => {
      setStatus(null);
      setTribeParams(null);
      if (!chat) return;
      (async () => {
        setAppMode(true);
        const isTribe = chat.type === constants.chat_types.tribe;
        if (isTribe) {
          ui.setLoadingChat(true);
          const params = await chats.getTribeDetails(chat.host, chat.uuid);
          if (params) {
            setTribeParams(params);
          }
          ui.setLoadingChat(false);
        }

        const r = await chats.checkRoute(chat.id, user.myid);
        if (r && r.success_prob && r.success_prob > 0.01) {
          setStatus("active");
        } else {
          setStatus("inactive");
        }
      })();
    }, [chat]);

    const feedURL = tribeParams && tribeParams.feed_url;
    const appURL = tribeParams && tribeParams.app_url;
    const tribeBots = tribeParams && tribeParams.bots;
    let messagePrice = 0;
    if (tribeParams) {
      messagePrice = tribeParams.price_per_message + tribeParams.escrow_amount;
    }

    return (
      <Section style={{ background: theme.deep }}>
        <Inner>
          <Head
            height={headHeight}
            appURL={appURL}
            setAppMode={setAppMode}
            appMode={appMode}
            messagePrice={messagePrice}
            status={status}
            tribeParams={tribeParams}
          />
          <ChatContent
            msgPrice={msgPrice}
            setMsgPrice={setMsgPrice}
            appMode={appMode}
            appURL={appURL}
            footHeight={footHeight}
            messagePrice={messagePrice}
          />
          <Foot
            msgPrice={msgPrice}
            setMsgPrice={setMsgPrice}
            height={footHeight}
            tribeBots={tribeBots}
            messagePrice={messagePrice}
          />
        </Inner>
        <Pod url={feedURL} chat={chat} onBoost={onBoostPod} />
      </Section>
    );
  });
}

const Inner = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

function ChatContent({
  appMode,
  appURL,
  footHeight,
  msgPrice,
  setMsgPrice,
  messagePrice,
}) {
  const { contacts, ui, chats, meme, msg, user, details } = useStores();
  const chat = ui.selectedChat;
  const [alert, setAlert] = useState(``);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [menuMessage, setMenuMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msgCount, setMsgCount] = useState(20);
  const [customBoost, setCustomBoost] = useState(user.tipAmount || 100);
  const [insfBalance, setInsfBalance] = useState(false);
  const myid = user.myid;

  async function dropzoneUpload(files) {
    const file = files[0];
    const server = meme.getDefaultServer();
    setUploading(true);
    const typ = file.type || "text/plain";
    // console.log("type === ", typ)
    // console.log("host === ", server.host)
    // console.log("token === ", server.token)
    // console.log("filename === ", file.name)
    // console.log("file === ", file)
    const r = await uploadFile(
      file,
      typ,
      server.host,
      server.token,
      file.name || "Image.jpg"
    );
    await msg.sendAttachment({
      contact_id: null,
      chat_id: chat.id,
      muid: r.muid,
      media_key: r.media_key,
      media_type: typ,
      text: "",
      price: parseInt(msgPrice) || 0,
      amount: messagePrice || 0,
    });
    setMsgPrice("");
    setUploading(false);
  }

  // boost an existing message
  function onMessageBoost(uuid) {
    if (!uuid) return;
    const amount = (customBoost || user.tipAmount || 100) + messagePrice;
    if (amount > details.balance) {
      setInsfBalance(true);
      setTimeout(() => {
        setInsfBalance(false);
      }, 3500);
      return;
    }
    msg.sendMessage({
      boost: true,
      contact_id: null,
      text: "",
      amount,
      chat_id: chat.id || null,
      reply_uuid: uuid,
      message_price: messagePrice,
    });
    setCustomBoost(user.tipAmount || 100);
  }

  const handleMenuClick = (event, m) => {
    setAnchorEl(event.currentTarget);
    setMenuMessage(m);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuMessage(null);
    setCustomBoost(user.tipAmount || 100);
  };

  function onCopy(word) {
    setAlert(`${word} copied to clipboard`);
    setTimeout(() => {
      setAlert(``);
    }, 2000);
  }

  async function onApproveOrDenyMember(contactId, status, msgId) {
    await msg.approveOrRejectMember(contactId, status, msgId);
  }

  return useObserver(() => {
    const chat = ui.selectedChat;

    const msgs = useMsgs(chat) || [];
    // console.log(msgs);
    const isTribe = chat && chat.type === constants.chat_types.tribe;
    const h = `calc(100% - ${headHeight + footHeight}px)`;

    useEffect(() => {
      setMsgCount(20);
    }, [chat && chat.id]);

    if (ui.loadingChat) {
      return (
        <LoadingWrap style={{ maxHeight: h, minHeight: h }}>
          <CircularProgress size={32} style={{ color: "white" }} />
        </LoadingWrap>
      );
    }
    if (ui.showBots) {
      return <Bots />;
    }

    const shownMsgs = msgs.slice(0, msgCount);

    function handleScroll(e) {
      if (e.target.scrollTop === 0) {
        setMsgCount((c) => c + 20);
      }
    }

    async function joinTribe(tribeParams) {
      if (tribeParams) ui.setViewTribe(tribeParams);
    }

    if (chat && chat.status === constants.chat_statuses.pending) {
      return (
        <Wrap h={h} style={{ alignItems: "center", justifyContent: "center" }}>
          Waiting for admin approval
        </Wrap>
      );
    }

    return (
      <Wrap h={h}>
        <Dropzone
          disabled={!chat}
          noClick={true}
          multiple={false}
          onDrop={dropzoneUpload}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div style={{ flex: 1 }} {...getRootProps()}>
              <input {...getInputProps()} />
              {(isDragActive || uploading) && (
                <DropZoneContainer h={h}>
                  <DropZoneInner>
                    {uploading
                      ? "File Uploading..."
                      : "Drag Image or Video here"}
                  </DropZoneInner>
                </DropZoneContainer>
              )}
              <Layer show={!appMode} style={{ background: theme.deep }}>
                <MsgList
                  className="msg-list"
                  onScroll={handleScroll}
                  id="chat-content"
                >
                  {shownMsgs.map((m, i) => {
                    const { senderAlias, senderPic } = useMsgSender(
                      m,
                      contacts.contacts,
                      isTribe
                    );
                    if (m.dateLine) {
                      return (
                        <DateLine key={"date" + i} dateString={m.dateLine} />
                      );
                    }
                    if (!m.chat) m.chat = chat;
                    return (
                      <Msg
                        joinTribe={joinTribe}
                        key={m.id}
                        {...m}
                        senderAlias={senderAlias}
                        senderPic={senderPic}
                        handleClick={(e) => handleMenuClick(e, m)}
                        handleClose={handleMenuClose}
                        onCopy={onCopy}
                        myid={myid}
                        onApproveOrDenyMember={onApproveOrDenyMember}
                      />
                    );
                  })}
                </MsgList>
                {alert && (
                  <Alert
                    style={{
                      position: "absolute",
                      bottom: 20,
                      left: "calc(50% - 90px)",
                      opacity: 0.7,
                      height: 35,
                      padding: `0px 8px 4px 8px`,
                    }}
                    icon={false}
                  >
                    {alert}
                  </Alert>
                )}
                {insfBalance && (
                  <Alert
                    style={{
                      position: "absolute",
                      bottom: "50%",
                      left: "calc(50% - 105px)",
                      opacity: 0.9,
                    }}
                    icon={false}
                  >
                    Insufficient Balance
                  </Alert>
                )}
                <MsgMenu
                  anchorEl={anchorEl}
                  menuMessage={menuMessage}
                  isMe={menuMessage && menuMessage.sender === myid}
                  handleMenuClose={handleMenuClose}
                  onCopy={onCopy}
                  onBoost={onMessageBoost}
                  customBoost={customBoost}
                  setCustomBoost={setCustomBoost}
                />
              </Layer>
              {appURL && (
                <Layer
                  show={appMode}
                  style={{
                    background: theme.deep,
                    height: "calc(100% + 63px)",
                  }}
                >
                  <Frame url={appURL} />
                </Layer>
              )}
            </div>
          )}
        </Dropzone>
        <Anim />
      </Wrap>
    );
  });
}

function DateLine({ dateString }) {
  return (
    <DateWrap>
      <BackLine />
      <DateString style={{ background: theme.deep }}>{dateString}</DateString>
    </DateWrap>
  );
}

const DropZoneContainer = styled.div`
  position: absolute;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: black;
  outline: none;
  height: 100%;
  width: 100%;
  opacity: 0.5;
  z-index: 102;
`;

const DropZoneInner = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 50px;
  border-width: 3px;
  border-radius: 15px;
  height: 100%;
  min-width: calc(100% - 100px);
  max-width: calc(100% - 100px);
  border-style: dashed;
  color: white;
  transition: border 0.24s ease-in-out;
`;

const Wrap = styled.div`
  flex: 1;
  display: flex;
  padding-right: 3px;
  position: relative;
  min-height: ${(p) => p.h};
  max-height: ${(p) => p.h};
  width: 100%;
  position: relative;
  z-index: 99;
`;
const Section = styled.section`
  height: 100%;
  flex: 1;
  position: relative;
  z-index: 99;
  display: flex;
  flex-direction: row;
`;
const MsgList = styled.div`
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column-reverse;
  max-height: 100%;
  padding: 8px 0;
`;
const Layer = styled.div`
  flex: 1;
  display: flex;
  padding-right: 3px;
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: ${(p) => (p.show ? 101 : 99)};
`;
const DateWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  position: relative;
  position: relative;
  padding: 0 7px;
`;
const DateString = styled.div`
  height: 14px;
  font-size: 14px;
  color: grey;
  position: relative;
  padding: 0 8px;
`;
const BackLine = styled.div`
  background: grey;
  height: 1px;
  width: 96%;
  position: absolute;
  top: 8px;
  left: 2%;
`;
const LoadingWrap = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default Chat;
