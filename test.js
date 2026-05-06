const url = "https://script.google.com/macros/s/AKfycbyUQ_8SH5-LPKo_BY33PJhdkoLDykLEQn0FkO4MudCocMEiDMr9Fizx3ZfKxJ3kQLxT/exec";

async function test() {
    const body = {
        action: 'verifyAdmin',
        adminPIN: '1234'
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(body)
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response text:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
