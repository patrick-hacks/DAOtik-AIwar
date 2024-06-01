// index.js

// - get proposals for x daos
// - throw proposals into galadriel contract
// - get result from galadriel contract and put it in json
// - (vote on proposal)
// - execute lit code every x minutes

const cron = require('node-cron');
const ethers = require('ethers');
require('dotenv').config();

// galadriel initialization
const abi = [
	"function submitProposals(string[] memory proposalDescriptions, uint[] memory proposalIds) public",
	"function getProposalAdvice(uint proposalId) public view returns (string memory)",
	"function test() public view returns (string memory)",
	{
		"inputs": [
		  {
			"internalType": "uint256",
			"name": "",
			"type": "uint256"
		  }
		],
		"name": "proposals",
		"outputs": [
		  {
			"internalType": "uint256",
			"name": "id",
			"type": "uint256"
		  },
		  {
			"internalType": "string",
			"name": "description",
			"type": "string"
		  },
		  {
			"internalType": "string",
			"name": "summarizedDescription",
			"type": "string"
		  },
		  {
			"internalType": "string",
			"name": "advice",
			"type": "string"
		  },
		  {
			"internalType": "uint256",
			"name": "iteration",
			"type": "uint256"
		  },
		  {
			"internalType": "bool",
			"name": "isVoted",
			"type": "bool"
		  },
		  {
			"internalType": "bool",
			"name": "isResolved",
			"type": "bool"
		  }
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"type": "event",
		"name": "ProposalCreated",
		"inputs": [
			{
				"name": "proposalId",
				"type": "uint256",
				"indexed": false,
				"internalType": "uint256"
			},
			{
				"name": "proposer",
				"type": "address",
				"indexed": false,
				"internalType": "address"
			},
			{
				"name": "targets",
				"type": "address[]",
				"indexed": false,
				"internalType": "address[]"
			},
			{
				"name": "values",
				"type": "uint256[]",
				"indexed": false,
				"internalType": "uint256[]"
			},
			{
				"name": "signatures",
				"type": "string[]",
				"indexed": false,
				"internalType": "string[]"
			},
			{
				"name": "calldatas",
				"type": "bytes[]",
				"indexed": false,
				"internalType": "bytes[]"
			},
			{
				"name": "voteStart",
				"type": "uint256",
				"indexed": false,
				"internalType": "uint256"
			},
			{
				"name": "voteEnd",
				"type": "uint256",
				"indexed": false,
				"internalType": "uint256"
			},
			{
				"name": "description",
				"type": "string",
				"indexed": false,
				"internalType": "string"
			}
		],
		"anonymous": false
	}
];
const contractAddress = process.env.ADVISOR_CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider(process.env.GALADRIEL_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const signer = wallet.connect(provider);
const contract = new ethers.Contract(contractAddress, abi, signer);

// dao contract initialization
const daoAbi = [
];
const daoContractAddress = '0x59c6765e180ba50FaD3f089e6D26cDeb5eaC9CdA';
const daoProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const daoWallet = new ethers.Wallet(process.env.PRIVATE_KEY, daoProvider);
const daoSigner = daoWallet.connect(daoProvider);
const daoContract = new ethers.Contract(daoContractAddress, daoAbi, daoSigner);

const submitProposals = async (proposalDescriptions, proposalIds) => {
	try {
		const transactionResponse = await contract.submitProposals(proposalDescriptions, proposalIds);
		await transactionResponse.wait();
		console.log('	Successfully submitted proposals:', transactionResponse.hash);
	} catch (error) {
		console.error('	Error submitting proposals:', error);
	}
}

const getAdvice = async (proposalId) => {
	const proposalData = await contract.getProposalAdvice(proposalId);
	return proposalData.advice;
}

const getProposal = async (index) => {
	const proposalData = await contract.proposals(index);
	return proposalData;
}

const getProposalDataTally = async () => {
	// get list of proposals
	  const query = `
		query ProposalsV2($input: ProposalsInput!) {
			proposalsV2(input: $input) {
			nodes {
				... on ProposalV2 {
						id
						metadata {
							description
					}
				}
			}
			pageInfo {
				firstCursor
				lastCursor
				count
			}
			}
		}
	  `;
	  const variables = {
		chainId: "eip155:1",
		pagination: { limit: 1, offset: 0 },
		sort: { field: "START_BLOCK", order: "DESC" },

		input: {
			filters: {
					governorId: "eip155:1:0x323A76393544d5ecca80cd6ef2A560C6a395b7E3"
			},
			page: {
			  limit: 1
			},
			sort: {
			  isDescending: true,
			  sortBy: "id"
			}
		  }
	  }; 
	  const url = 'https://api.tally.xyz/query';
	  const apiKey = process.env.TALLY_API_KEY; // Replace with your actual API key
	  
	  const response = await fetch(url, {
		method: 'POST',
		headers: {
		"Content-Type": "application/json",
		'Api-Key': apiKey, // If an API key is required
		},
		body: JSON.stringify({
		query: query,
		variables: variables,
		}),
	  });
	  
	  if (!response.ok) {
		throw new Error('Network response was not ok ' + response.statusText);
	  }
	  
	  const data = await response.json();
	  
	  if (data.errors) {
		console.error('Error when fetching data:', data.errors);
		return null;
	  }
	  
	  console.log(data.data.proposalsV2.nodes[0]);

	  return data.data;
};

const getProposalDataEtherscan = async (daoContract, startBlock) => {
	const url = 'https://api-sepolia.etherscan.io/api';

	const params = new URLSearchParams({
		module: 'logs',
		action: 'getLogs',
		fromBlock: startBlock,
		toBlock: 'latest',
		address: daoContract,
		topic0: '0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0',
		apikey: 'YourApiKeyToken'
	});

	const fullURL = `${url}?${params.toString()}`;

	try {
		const response = await fetch(fullURL);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error fetching data:', error);
		return null;
	}
};

const decodeEventLog = (data) => {
	const interface = new ethers.Interface(abi);
	const decodedData = interface.decodeEventLog('ProposalCreated', data);
	return decodedData;
}

const getCurrentSepoliaBlock = async () => {
	const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
	const currentBlock = await provider.getBlockNumber();
	return currentBlock;
}

const voteOnProposal = async (proposalId, vote) => {
	
}

// // Schedule the contract call to occur once per second
// cron.schedule('* * * * * *', async () => {
// 	await callContractMethod();
// 	console.log('Smart contract method called successfully.');
// });

function Proposal(id, description, summarizedDescription, advice, iteration, isVoted, isResolved) {
	this.id = id;
	this.description = description;
	this.summarizedDescription = summarizedDescription;
	this.advice = advice;
	this.iteration = iteration;
	this.isVoted = isVoted;
	this.isResolved = isResolved;
}

const main = async () => {
	var startBlock = '6013300'
	const daoContract = '0x59c6765e180ba50FaD3f089e6D26cDeb5eaC9CdA';
	const proposals = [];
	console.log("Starting to process proposals from block: ", startBlock, "....\n");
	while (1) {
		const newProposals = await getProposalDataEtherscan(daoContract, startBlock);
		if (newProposals.result[0] == undefined) {
			console.log("No new proposals found");
		}
		else {
			console.log("New proposals found. Amount: ", newProposals.result.length, "proposals");
			const prevAmount = proposals.length;
			for (let i = 0; i < newProposals.result.length; i++) {
				const currentBlock = await getCurrentSepoliaBlock();
				const decodedData = decodeEventLog(newProposals.result[i].data);
				if (decodedData.voteStart < currentBlock && decodedData.voteEnd > currentBlock) {
					proposals.push(new Proposal(decodedData.proposalId, decodedData.description, "", "", 0, false, false));
					console.log(proposals.length - 1, "proposal:	", proposals[proposals.length - 1]);
					startBlock = parseInt(newProposals.result[i].blockNumber) + 1;
					console.log("New starting block:", startBlock)
				}
			}
			if (proposals.length > prevAmount) {
				console.log("\nSubmitting proposals to Galadriel contract....")
				await submitProposals([proposals[proposals.length - 1].description], [proposals[proposals.length - 1].id]);
				await new Promise(r => setTimeout(r, 5000));
				console.log("Getting advice from Galadriel contract....")
				for (let i = prevAmount; i < proposals.length; i++) {
					proposals[i].advice = await getAdvice(proposals[i].id);
					if (proposals[i].advice.slice(-1) == "Y") {
						proposals[i].isVoted = true;
					}
					else if (proposals[i].advice.slice(-1) == "N") {
						proposals[i].isVoted = false;
					}
					else {
						console.log("Invalid advice: ", proposals[i].advice);
					}
				}
			}
			else {
				console.log("No proposals currently in voting period.");
			}
		}
		// sleep 2 seconds
		console.log("Sleeping for 5 seconds....\n\n")
		await new Promise(r => setTimeout(r, 5000));
	}
}

const test = async () => {
	var i = 0;
	while (1) {
		const advice = await getProposal(i);
		console.log(advice);
		i++;
	}
}

test();
// main();
