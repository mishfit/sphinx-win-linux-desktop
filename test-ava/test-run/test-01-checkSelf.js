var test = require('ava');
var h = require('../helpers/helper-functions')
var i = require('../test-functions')
var r = require('../run-ava')

test('check node exists, is own first contact', async t => {
    const nodeArray = r[r.active]
    await h.runTest(t, i.checkSelf, nodeArray, false) //always iterate: false
})