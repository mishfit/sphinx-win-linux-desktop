var http = require('ava-http');
var h = require('../helpers')

function getCheckNewPaidMsgs(t, node, imgMsg){

    var msgToken = imgMsg.media_token.split(".")[1]

    return new Promise((resolve, reject) => {
      let i = 0
      const interval = setInterval(async() => {
        i++
        const msgRes = await http.get(node.ip+'/messages', h.makeArgs(node))
        if(msgRes.response.new_messages && msgRes.response.new_messages.length) {
          const paidMessage = msgRes.response.new_messages.find(msg => (msg.type === 8) && (msg.media_token.split(".")[1] === (msgToken)))
          if(paidMessage) {
            clearInterval(interval)
            resolve(paidMessage)
          }
        }
        if(i>10){
          clearInterval(interval)
          reject(["failed to getCheckNewPaidMsgs"])
        } 
      }, 1000)
    })
  }

  module.exports = getCheckNewPaidMsgs