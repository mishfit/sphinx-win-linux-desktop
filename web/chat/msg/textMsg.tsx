import React, { useEffect } from "react";
import styled from "styled-components";
import { ReactTinyLink } from "react-tiny-link-electron";
import {
  useParsedGiphyMsg,
  useParsedClipMsg,
} from "../../../src/store/hooks/msg";
import Linkify from "react-linkify";
import * as ipc from "../../crypto/ipc";
import { useHasLink } from "./hooks";
import Clip from "./clipMsg";
import JitsiMsg from "./jitsiMsg";
import Boost from "./boostMsg";
import TribeMsg from "./tribeMsg";
import BoostRow from "./boostRow";
import ContactMsg from "./contactMsg";

export default function TextMsg(props) {
  const { message_content, sender, joinTribe } = props;
  const isMe = sender === props.myid;
  const link = useHasLink(props);
  const hasLink = message_content && link;
  if (hasLink) {
    return (
      <Wrap {...props}>
        <LinkifyWrapper>
          <Linkify
            componentDecorator={(decoratedHref, decoratedText, key) => (
              <a
                target="blank"
                href={decoratedHref}
                key={key}
                onClick={(e) => {
                  e.preventDefault();
                  ipc.send(`link`, { link });
                }}
              >
                {decoratedText}
              </a>
            )}
          >
            {message_content}
          </Linkify>
        </LinkifyWrapper>
        <ReactTinyLink
          cardSize="small"
          showGraphic={true}
          maxLine={2}
          minLine={1}
          url={link}
        />
      </Wrap>
    );
  }

  const isTribe =
    message_content &&
    message_content.startsWith("sphinx.chat://?action=tribe");
  if (isTribe) {
    return <TribeMsg {...props} />;
  }

  const contactRegex = /^[0-9a-fA-F]{66}$/;
  if (contactRegex.test(message_content)) {
    return <ContactMsg {...props} />;
  }

  const isGiphy = message_content && message_content.startsWith("giphy::");
  if (isGiphy) {
    const { url, aspectRatio, text } = useParsedGiphyMsg(message_content);
    return (
      <div>
        <GIF src={url} aspectRatio={aspectRatio} />
        <TextWrap>{text}</TextWrap>
      </div>
    );
  }

  const isClip = message_content && message_content.startsWith("clip::");
  if (isClip) {
    const params = useParsedClipMsg(message_content);
    return <Clip {...params} isMe={isMe} uuid={props.uuid} />;
  }
  const isBoost = message_content && message_content.startsWith("boost::");
  if (isBoost) {
    return <Boost {...props} isMe={isMe} />;
  }

  const isJitsi =
    message_content && message_content.startsWith("https://jitsi.sphinx.chat/");
  if (isJitsi) {
    return <JitsiMsg link={message_content} onCopy={props.onCopy} />;
  }

  const emo_regex =
    /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])$/;
  if (emo_regex.test(message_content)) {
    return (
      <Wrap {...props} style={{ fontSize: 40 }}>
        {message_content}
      </Wrap>
    );
  }
  return <Wrap {...props}>{message_content}</Wrap>;
}

function Wrap(props: {
  children: any;
  style?: Object;
  boosts_total_sats: number;
  boosts: any;
  sender: number;
  myid: number;
}) {
  const isMe = props.sender === props.myid;
  const { children, style, boosts_total_sats, boosts } = props;
  return (
    <WrapDiv style={style}>
      {children}
      {(boosts_total_sats ? true : false) && (
        <BoostRow {...props} isMe={isMe} />
      )}
    </WrapDiv>
  );
}

const WrapDiv = styled.div`
  padding: 16px;
  max-width: 440px;
  word-break: break-word;
`;
const LinkifyWrapper = styled.div`
  margin-bottom: 10px;
  & a {
    color: #618aff;
  }
`;
const Link = styled.a`
  display: block;
  padding: 16px;
  max-width: 440px;
  word-break: break-word;
  color: #6089ff;
  &:focus {
    color: #6089ff;
  }
  &:visited {
    color: #6089ff;
  }
`;
const LinkWrap = styled.div``;
const GIF = styled.div`
  background-image: url(${(p) => p.src});
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  height: 220px;
  width: ${(p) => 220 * (p.aspectRatio || 1)}px;
`;
const TextWrap = styled.div`
  padding: 15px;
`;
