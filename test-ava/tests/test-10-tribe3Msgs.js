var test = require('ava');
var h = require('../helpers/helper-functions')
var r = require('../run-ava')
var nodes = require('../nodes.json')
var f = require('../functions')

/*
npx ava test-10-tribe3Msgs.js --verbose --serial --timeout=2m
*/

test('create tribe, two nodes join tribe, send messages, 2 nodes leave tribe, delete tribe', async t => {
    const nodeArray = r[r.active]
    await h.runTest(t, tribe3Msgs, nodeArray, r.iterate)
})

async function tribe3Msgs(t, index1, index2, index3) {
//THREE NODES SEND TEXT MESSAGES WITHIN A TRIBE ===>

    let node1 = nodes[index1]
    let node2 = nodes[index2]
    let node3 = nodes[index3]
    t.truthy(node3, "this test requires three nodes")

    console.log(`${node1.alias} and ${node2.alias} and ${node3.alias}`)

    const node1bal = await f.getBalance(t, node1)
    const node2bal = await f.getBalance(t, node2)
    const node3bal = await f.getBalance(t, node3)
    // console.log("balances === ", node1bal, node2bal, node3bal)

    //NODE1 CREATES A TRIBE
    let tribe = await f.createTribe(t, node1)
    t.truthy(tribe, "tribe should have been created by node1")

    //NODE2 JOINS TRIBE CREATED BY NODE1
    if(node1.routeHint) tribe.owner_route_hint = node1.routeHint
    let join = await f.joinTribe(t, node2, tribe)
    t.true(join, "node2 should join tribe")

    //NODE3 JOINS TRIBE CREATED BY NODE1
    if(node1.routeHint) tribe.owner_route_hint = node1.routeHint
    let join2 = await f.joinTribe(t, node3, tribe)
    t.true(join2, "node3 should join tribe")

    //NODE1 SENDS A TEXT MESSAGE IN TRIBE
    const text = h.randomText()
    let tribeMessage = await f.sendTribeMessage(t, node1, tribe, text)
    t.true(tribeMessage.success, "node1 should send message to tribe")

    //CHECK THAT NODE1'S DECRYPTED MESSAGE IS SAME AS INPUT
    const n2check = await f.checkDecrypt(t, node2, text, tribeMessage.message)
    t.true(n2check, "node2 should have read and decrypted node1 message")

    //CHECK THAT NODE1'S DECRYPTED MESSAGE IS SAME AS INPUT
    const n3check = await f.checkDecrypt(t, node3, text, tribeMessage.message)
    t.true(n3check, "node3 should have read and decrypted node1 message")

    //NODE2 SENDS A TEXT MESSAGE IN TRIBE
    const text2 = h.randomText()
    let tribeMessage2 = await f.sendTribeMessage(t, node2, tribe, text2)
    t.true(tribeMessage2.success, "node2 should send message to tribe")

    //CHECK THAT NODE2'S DECRYPTED MESSAGE IS SAME AS INPUT
    const n1check = await f.checkDecrypt(t, node1, text2, tribeMessage2.message)
    t.true(n1check, "node1 should have read and decrypted node2 message")

    //CHECK THAT NODE2'S DECRYPTED MESSAGE IS SAME AS INPUT
    const n3check2 = await f.checkDecrypt(t, node3, text2, tribeMessage2.message)
    t.true(n3check2, "node3 should have read and decrypted node2 message")

    //NODE3 SENDS A TEXT MESSAGE IN TRIBE
    const text3 = h.randomText()
    let tribeMessage3 = await f.sendTribeMessage(t, node3, tribe, text3)
    t.true(tribeMessage3.success, "node3 should send message to tribe")

    //CHECK THAT NODE3'S DECRYPTED MESSAGE IS SAME AS INPUT
    const n1check2 = await f.checkDecrypt(t, node1, text3, tribeMessage3.message)
    t.true(n1check2, "node1 should have read and decrypted node3 message")

    //CHECK THAT NODE2'S DECRYPTED MESSAGE IS SAME AS INPUT
    const n2check2 = await f.checkDecrypt(t, node2, text3, tribeMessage3.message)
    t.true(n2check2, "node2 should have read and decrypted node3 message")

    //NODE2 LEAVES THE TRIBE
    let n2left = await f.leaveTribe(t, node2, tribe)
    t.true(n2left, "node2 should leave tribe")

    //NODE3 LEAVES THE TRIBE
    let n3left = await f.leaveTribe(t, node3, tribe)
    t.true(n3left, "node3 should leave tribe")

    //NODE1 DELETES THE TRIBE
    let delTribe = await f.deleteTribe(t, node1, tribe)
    t.true(delTribe, "node1 should delete tribe")

}

module.exports = tribe3Msgs