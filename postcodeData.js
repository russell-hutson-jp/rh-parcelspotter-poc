// postcodeData.js
const postcodeData = [
    { postcode: "JE21AA", round: "R01" },
    { postcode: "JE21AB", round: "R02" },
    { postcode: "JE31AA", round: "R03" },
    { postcode: "JE31AB", round: "R04" },
    { postcode: "JE11AA", round: "R05" },
    { postcode: "JE12AA", round: "R06" },
    // ... Add 500 more postcode entries for testing
];

// Add more postcode data for testing
for (let i = 0; i < 500; i++) {
    let roundNum = (i + 7).toString().padStart(3, '0'); // Starting from R07
    let postcode = `JE${Math.floor(Math.random() * 9 + 1)}${Math.floor(Math.random() * 9)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    postcodeData.push({ postcode: postcode, round: `R${roundNum}` });
}

console.log("postcodeData: ", postcodeData);

