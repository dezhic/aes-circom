const path = require("path");
const assert = require('assert');
const crypto = require("crypto");
const wasmTester = require('circom_tester').wasm;
const Module = require('./module.js');

describe("Complete Encryption test", () => {
    it("Show do encryption correctly", async() => {
        const cir = await wasmTester(path.join(__dirname,"circuits","gcm_siv_enc_2_keys_test.circom"));
        const K1 = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        const N = [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        const AAD = [];
        const MSG = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        // const CIPHERTEXT = Uint8Array.from([133,160,27,99,2,91,161,155,127,211,221,252,3,59,62,118,201,234,198,250,112,9,66,112,46,144,134,35,131,198,195,102]);
        var CT = [];

		const K1_ptr = Module._malloc(K1.length * Uint8Array.BYTES_PER_ELEMENT);
		const N_ptr = Module._malloc(N.length * Uint8Array.BYTES_PER_ELEMENT);
		const AAD_ptr = Module._malloc(AAD.length * Uint8Array.BYTES_PER_ELEMENT);
        const MSG_ptr = Module._malloc(MSG.length * Uint8Array.BYTES_PER_ELEMENT);
        const CT_ptr = Module._malloc(MSG.length * Uint8Array.BYTES_PER_ELEMENT);
        const TAG_ptr = Module._malloc(16 * Uint8Array.BYTES_PER_ELEMENT);

		Module.HEAPU8.set(new Uint8Array(K1), K1_ptr/Uint8Array.BYTES_PER_ELEMENT);
		Module.HEAPU8.set(new Uint8Array(N), N_ptr/Uint8Array.BYTES_PER_ELEMENT);
        Module.HEAPU8.set(new Uint8Array(AAD), AAD_ptr/Uint8Array.BYTES_PER_ELEMENT);
        Module.HEAPU8.set(new Uint8Array(MSG), MSG_ptr/Uint8Array.BYTES_PER_ELEMENT);

		Module._GCM_SIV_ENC_2_Keys(CT_ptr, TAG_ptr, K1_ptr, N_ptr, AAD_ptr, MSG_ptr, BigInt(AAD.length), BigInt(MSG.length));

		for(let i=0; i<MSG.length; i++)
		{
			CT.push(Module.HEAPU8[CT_ptr/Uint8Array.BYTES_PER_ELEMENT + i]);
		}
        for(let i=0; i<16; i++)
		{
			CT.push(Module.HEAPU8[TAG_ptr/Uint8Array.BYTES_PER_ELEMENT + i]);
		}

        const CIPHERTEXT = Uint8Array.from(CT);

        const hash = crypto.createHash("sha256")
            .update(CIPHERTEXT)
            .digest("hex");
        const x1 = BigInt("0x"+hash.slice(0,32));
        const x2 = BigInt("0x"+hash.slice(32));
        const CT_sha256 = [x1, x2];
        let witness = await cir.calculateWitness({"K1": K1, "N":N, "AAD":AAD, "MSG":MSG, "CIPHERTEXT_SHA256":CT_sha256});
        witness = witness[1];
        console.log("Expected", 1);
        console.log("witness", witness);
        assert.ok(witness==1);
    })
})