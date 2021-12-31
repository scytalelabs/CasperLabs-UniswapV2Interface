import { Avatar, CardHeader } from '@material-ui/core/';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import TextField from "@material-ui/core/TextField";
import Typography from '@material-ui/core/Typography';
import Autocomplete from "@material-ui/lab/Autocomplete";
import axios from "axios";
import {
    CasperClient, CLAccountHash, CLByteArray, CLKey, CLPublicKey, CLValueBuilder, DeployUtil, RuntimeArgs, Signer
} from 'casper-js-sdk';
import { slice } from 'lodash';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from "react";
import { Col, Row } from 'react-bootstrap';
import Spinner from "react-bootstrap/Spinner";
import windowSize from "react-window-size";
import "../../../assets/css/bootstrap.min.css";
import "../../../assets/css/style.css";
import "../../../assets/plugins/fontawesome/css/all.min.css";
import "../../../assets/plugins/fontawesome/css/fontawesome.min.css";
import { ROUTER_PACKAGE_HASH } from '../../../components/blockchain/AccountHashes/Addresses';
import { NODE_ADDRESS } from '../../../components/blockchain/NodeAddress/NodeAddress';
import Footer from "../../../components/Footers/Footer";
import HeaderHome from "../../../components/Headers/Header";


const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        width: '100%',
        backgroundColor: theme.palette.background.paper,
    },
    badge: {
        '& > *': {
            margin: theme.spacing(1),
        },
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },

    card: {
        minWidth: 250,
    },
    media: {
        height: 0,
        paddingTop: '100%', // 16:9
    },
    bullet: {
        display: 'inline-block',
        margin: '0 2px',
        transform: 'scale(0.8)',
    },
    title: {
        fontSize: 14,
    },
    pos: {
        marginBottom: 12,
    },
}));
// let RecipientType = CLPublicKey | CLAccountHash | CLByteArray;
function Pool(props) {
    const classes = useStyles();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    let [userName, setUserName] = useState();
    let [priceInUSD, setPriceInUSD] = useState(0);
    let [tokenA, setTokenA] = useState();
    let [tokenB, setTokenB] = useState();
    let [tokenANumber, setTokenANumber] = useState(0);
    let [tokenBNumber, setTokenBNumber] = useState(0);
    let [approveAIsLoading, setApproveAIsLoading] = useState(false);
    let [approveBIsLoading, setApproveBIsLoading] = useState(false);

    const [tokenList, setTokenList] = useState([])
    const [istokenList, setIsTokenList] = useState(false)
    let [isLoading, setIsLoading] = useState(false);
    let [msg, setMsg] = useState("");


    let handleSubmitEvent = (event) => {
        setMsg("");
        event.preventDefault();

    };
    useEffect(() => {
        axios
            .get('/tokensList')
            .then((res) => {
                console.log('resresres', res)
                console.log(res.data.tokens)
                setIsTokenList(true)
                setTokenList(res.data.tokens)
            })
            .catch((error) => {
                console.log(error)
                console.log(error.response)
            })// eslint-disable-next-line
        axios
            .post("priceconversion", {
                symbolforconversion: "CSPR",
                symboltoconvertto: "USD",
                amount: 1
            })
            .then((response) => {
                console.log("response", response.data.worth.USD);
                setPriceInUSD(response.data.worth.USD.price);
            })
            .catch((error) => {
                console.log("response", error.response);
            });
    }, []);
    function createRecipientAddress(recipient) {
        if (recipient instanceof CLPublicKey) {
            return new CLKey(new CLAccountHash(recipient.toAccountHash()));
        } else {
            return new CLKey(recipient);
        }
    };
    async function approveMakedeploy(contractHash) {
        console.log('contractHash', contractHash);
        const publicKeyHex = localStorage.getItem("Address")
        if (publicKeyHex !== null && publicKeyHex !== 'null' && publicKeyHex !== undefined) {
            const publicKey = CLPublicKey.fromHex(publicKeyHex);
            const spender = ROUTER_PACKAGE_HASH;
            const spenderByteArray = new CLByteArray(Uint8Array.from(Buffer.from(spender, 'hex')));
            const paymentAmount = 5000000000;
            const runtimeArgs = RuntimeArgs.fromMap({
                spender: createRecipientAddress(spenderByteArray),
                amount: CLValueBuilder.u256(5)
            });

            let contractHashAsByteArray = Uint8Array.from(Buffer.from(contractHash.slice(5), "hex"));
            let entryPoint = 'approve';

            // Set contract installation deploy (unsigned).
            let deploy = await makeDeploy(publicKey, contractHashAsByteArray, entryPoint, runtimeArgs, paymentAmount)
            console.log("make deploy: ", deploy);
            try {
                let signedDeploy = await signdeploywithcaspersigner(deploy, publicKeyHex)
                let result = await putdeploy(signedDeploy)
                console.log('result', result);
                let variant = "success";
                enqueueSnackbar('Approved Successfully', { variant });
            }
            catch {
                let variant = "Error";
                enqueueSnackbar('User Canceled Signing', { variant });
            }

        }
        else {
            let variant = "error";
            enqueueSnackbar('Connect to Casper Signer Please', { variant });
        }
    }
    async function makeDeploy(publicKey, contractHashAsByteArray, entryPoint, runtimeArgs, paymentAmount) {
        let deploy = DeployUtil.makeDeploy(
            new DeployUtil.DeployParams(publicKey, 'casper-test'),
            DeployUtil.ExecutableDeployItem.newStoredContractByHash(
                contractHashAsByteArray,
                entryPoint,
                runtimeArgs
            ),
            DeployUtil.standardPayment(paymentAmount)
        );
        return deploy
    }

    async function signdeploywithcaspersigner(deploy, publicKeyHex) {
        let deployJSON = DeployUtil.deployToJson(deploy);
        let signedDeployJSON = await Signer.sign(deployJSON, publicKeyHex, publicKeyHex);
        let signedDeploy = DeployUtil.deployFromJson(signedDeployJSON).unwrap();

        console.log("signed deploy: ", signedDeploy);
        return signedDeploy;
    }
    async function putdeploy(signedDeploy) {
        // Dispatch deploy to node.
        const client = new CasperClient(NODE_ADDRESS);
        const installDeployHash = await client.putDeploy(signedDeploy);
        console.log(`... Contract installation deployHash: ${installDeployHash}`);
        const result = await getDeploy(NODE_ADDRESS, installDeployHash);
        console.log(`... Contract installed successfully.`, JSON.parse(JSON.stringify(result)));
        return result;
    }
    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function getDeploy(NODE_URL, deployHash) {
        const client = new CasperClient(NODE_URL);
        let i = 1000;
        while (i !== 0) {
            const [deploy, raw] = await client.getDeploy(deployHash);
            if (raw.execution_results.length !== 0) {
                // @ts-ignore
                if (raw.execution_results[0].result.Success) {

                    return deploy;
                } else {
                    // @ts-ignore
                    throw Error("Contract execution: " + raw.execution_results[0].result.Failure.error_message);
                }
            } else {
                i--;
                await sleep(1000);
                continue;
            }
        }
        throw Error('Timeout after ' + i + 's. Something\'s wrong');
    }
    return (

        <div className="account-page">
            <div className="main-wrapper">
                <div className="home-section home-full-height">
                    <HeaderHome selectedNav={"Pool"} />
                    <div className="card">
                        <div className="container-fluid">
                            <div
                                className="content"
                                style={{ paddingTop: "150px", minHeight: "100vh" }}
                                position="absolute"
                            >
                                <div className="container-fluid">
                                    <div
                                        className="row"
                                        style={{ height: `${props.windowHeight}`, marginRight: "px" }}
                                    >
                                        <div className="col-md-10 offset-md-1">
                                            <div className="account-content">
                                                <div className="row align-items-center justify-content-center">
                                                    <div className="col-md-12 col-lg-6 login-right">
                                                        <>
                                                            <div className="login-header">
                                                                <h3 style={{ textAlign: "center" }}>Add Liquidity</h3>
                                                            </div>
                                                            <form onSubmit={handleSubmitEvent}>
                                                                <div className="row">
                                                                    <div className="col-md-12 col-lg-7">
                                                                        <div className="filter-widget">
                                                                            <Autocomplete
                                                                                id="combo-dox-demo"
                                                                                required
                                                                                options={tokenList}

                                                                                getOptionLabel={(option) =>
                                                                                    option.name + ',' + option.symbol
                                                                                }
                                                                                onChange={(event, value) => {
                                                                                    console.log('event', event);
                                                                                    console.log('value', value);
                                                                                    setTokenA(value)
                                                                                    setTokenBNumber(0)
                                                                                    setTokenANumber(0)
                                                                                }}
                                                                                renderInput={(params) => (
                                                                                    <TextField
                                                                                        {...params}
                                                                                        label="Select a token"
                                                                                        variant="outlined"
                                                                                    />
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-12 col-lg-3">
                                                                        {tokenB && tokenA ? (
                                                                            <input
                                                                                type="number"
                                                                                required
                                                                                value={tokenANumber}
                                                                                placeholder={0}
                                                                                min={0}
                                                                                step={.01}
                                                                                className="form-control"
                                                                                onChange={(e) => {
                                                                                    // setTokenANumber(e.target.value)
                                                                                    if (tokenA.name === 'WCSPR' && tokenB.name === "WISE") {
                                                                                        setTokenANumber(e.target.value)
                                                                                        setTokenBNumber(e.target.value * (10 / 1))
                                                                                    }
                                                                                    else if (tokenA.name === 'WISE' && tokenB.name === "WCSPR") {
                                                                                        setTokenANumber(e.target.value)
                                                                                        setTokenBNumber(e.target.value * (1 / 10))
                                                                                    }
                                                                                    else if (tokenA.name === 'WCSPR' && tokenB.name === "USDC") {
                                                                                        setTokenANumber(e.target.value)
                                                                                        setTokenBNumber(e.target.value * (1 / 8))
                                                                                    }
                                                                                    else if (tokenA.name === 'USDC' && tokenB.name === "WCSPR") {
                                                                                        setTokenANumber(e.target.value)
                                                                                        setTokenBNumber(e.target.value * (8 / 1))
                                                                                    }
                                                                                    else {
                                                                                        setTokenANumber(e.target.value)
                                                                                        setTokenBNumber(e.target.value)
                                                                                    }
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <input
                                                                                type="number"
                                                                                required
                                                                                value={tokenANumber}
                                                                                placeholder={0}
                                                                                className="form-control"
                                                                                disabled
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div style={{ textAlign: 'center', marginTop:'13px' }} className="col-md-12 col-lg-2">
                                                                        {Math.round(tokenANumber * priceInUSD * 1000) / 1000}$
                                                                    </div>
                                                                </div>
                                                                <br></br>
                                                                <div className="row">
                                                                    <div className="col-md-12 col-lg-7">
                                                                        <div className="filter-widget">
                                                                            <Autocomplete
                                                                                id="combo-dox-demo"
                                                                                required
                                                                                options={tokenList}
                                                                                // disabled={isDisabledImporter}
                                                                                getOptionLabel={(option) =>
                                                                                    option.name + ',' + option.symbol
                                                                                }
                                                                                onChange={(event, value) => {
                                                                                    console.log('event', event);
                                                                                    console.log('value', value);
                                                                                    setTokenB(value)
                                                                                    setTokenBNumber(0)
                                                                                    setTokenANumber(0)
                                                                                }}
                                                                                renderInput={(params) => (
                                                                                    <TextField
                                                                                        {...params}
                                                                                        label="Select a token"
                                                                                        variant="outlined"
                                                                                    />
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-12 col-lg-3">
                                                                        {tokenB && tokenA ? (
                                                                            <input
                                                                                type="number"
                                                                                required
                                                                                value={tokenBNumber}
                                                                                placeholder={0}
                                                                                min={0}
                                                                                step={.01}
                                                                                className="form-control"
                                                                                onChange={(e) => {
                                                                                    if (tokenB.name === 'WCSPR' && tokenA.name === "WISE") {
                                                                                        setTokenBNumber(e.target.value)
                                                                                        setTokenANumber(e.target.value * (10 / 1))
                                                                                    }
                                                                                    else if (tokenB.name === 'WISE' && tokenA.name === "WCSPR") {
                                                                                        setTokenBNumber(e.target.value)
                                                                                        setTokenANumber(e.target.value * (1 / 10))
                                                                                    }
                                                                                    else if (tokenB.name === 'WCSPR' && tokenA.name === "USDC") {
                                                                                        setTokenBNumber(e.target.value)
                                                                                        setTokenANumber(e.target.value * (1 / 8))
                                                                                    }
                                                                                    else if (tokenB.name === 'USDC' && tokenA.name === "WCSPR") {
                                                                                        setTokenBNumber(e.target.value)
                                                                                        setTokenANumber(e.target.value * (8 / 1))
                                                                                    }
                                                                                    else {
                                                                                        setTokenBNumber(e.target.value)
                                                                                        setTokenANumber(e.target.value)
                                                                                    }

                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <input
                                                                                type="number"
                                                                                required
                                                                                value={tokenBNumber}
                                                                                placeholder={0}
                                                                                style={{ height: '20px' }}
                                                                                disabled
                                                                                height='50'
                                                                                className="form-control"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div style={{ textAlign: 'center', marginTop:'13px' }} className="col-md-12 col-lg-2">
                                                                        {Math.round(tokenBNumber * priceInUSD * 1000) / 1000}$
                                                                    </div>
                                                                </div>
                                                                {tokenA ? (
                                                                    <div className="card">
                                                                        <CardHeader
                                                                            avatar={<Avatar src={tokenA.logoURI} aria-label="Artist" className={classes.avatar} />}
                                                                            title={tokenA.name}
                                                                            subheader={tokenA.symbol}
                                                                        />
                                                                        <Typography variant="body3" color="textSecondary" component="p">
                                                                            <strong>Contract Hash: </strong>{tokenA.address}
                                                                        </Typography>
                                                                        <Typography variant="body3" color="textSecondary" component="p">
                                                                            <strong>Package Hash: </strong>{tokenA.packageHash}
                                                                        </Typography>
                                                                    </div>
                                                                ) : (null)}
                                                                {tokenB ? (
                                                                    <div className="card">
                                                                        <CardHeader
                                                                            avatar={<Avatar src={tokenB.logoURI} aria-label="Artist" className={classes.avatar} />}
                                                                            title={tokenB.name}
                                                                            subheader={tokenB.symbol}
                                                                        />
                                                                        <Typography variant="body3" color="textSecondary" component="p">
                                                                            <strong>Contract Hash: </strong>{tokenB.address}
                                                                        </Typography>
                                                                        <Typography variant="body3" color="textSecondary" component="p">
                                                                            <strong>Package Hash: </strong>{tokenB.packageHash}
                                                                        </Typography>
                                                                    </div>
                                                                ) : (null)}
                                                                <Row>
                                                                    <Col>
                                                                        {tokenA && tokenANumber > 0 ? (
                                                                            approveAIsLoading ? (
                                                                                <div className="text-center">
                                                                                    <Spinner
                                                                                        animation="border"
                                                                                        role="status"
                                                                                        style={{ color: "#ff0000" }}
                                                                                    >
                                                                                        <span className="sr-only">Loading...</span>
                                                                                    </Spinner>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    className="btn btn-block btn-lg login-btn"
                                                                                    onClick={async () => {
                                                                                        setApproveAIsLoading(true)
                                                                                        await approveMakedeploy(tokenA.address)
                                                                                        setApproveAIsLoading(false)
                                                                                    }
                                                                                    }
                                                                                >
                                                                                    Approve {tokenA.name}
                                                                                </button>
                                                                            )
                                                                        ) : (null)}
                                                                    </Col>
                                                                    <Col>
                                                                        {tokenB && tokenBNumber > 0 ? (
                                                                            approveBIsLoading ? (
                                                                                <div className="text-center">
                                                                                    <Spinner
                                                                                        animation="border"
                                                                                        role="status"
                                                                                        style={{ color: "#ff0000" }}
                                                                                    >
                                                                                        <span className="sr-only">Loading...</span>
                                                                                    </Spinner>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    className="btn btn-block btn-lg login-btn"
                                                                                    onClick={async () => {
                                                                                        setApproveBIsLoading(true)
                                                                                        await approveMakedeploy(tokenB.address)
                                                                                        setApproveBIsLoading(false)
                                                                                    }
                                                                                    }
                                                                                >
                                                                                    Approve {tokenB.name}
                                                                                </button>
                                                                            )
                                                                        ) : (null)}
                                                                    </Col>
                                                                </Row>
                                                                <br></br>
                                                                {tokenA && tokenB ? (
                                                                    <>
                                                                        <Typography variant="h5" color="textSecondary" component="p">
                                                                            <strong>Prices and pool share </strong>
                                                                        </Typography>
                                                                        <hr />
                                                                        <Row style={{ textAlign: 'center' }}>

                                                                            <Col>
                                                                                <Typography variant="body1" component="p">
                                                                                    {tokenA.name === 'WCSPR' && tokenB.name === "WISE" ? (
                                                                                        1 / 10
                                                                                    ) : tokenA.name === 'WISE' && tokenB.name === "WCSPR" ? (
                                                                                        10 / 1
                                                                                    ) : tokenA.name === 'WCSPR' && tokenB.name === "USDC" ? (
                                                                                        8 / 1
                                                                                    ) : tokenA.name === 'USDC' && tokenB.name === "WCSPR" ? (
                                                                                        1 / 8
                                                                                    ) : (
                                                                                        1
                                                                                    )}
                                                                                </Typography>
                                                                                <Typography variant="body1" component="p">
                                                                                    <strong> {tokenA.name} per {tokenB.name} </strong>
                                                                                </Typography>
                                                                            </Col>
                                                                            <Col>
                                                                                <Typography variant="body1" component="p">
                                                                                    {tokenB.name === 'WCSPR' && tokenA.name === "WISE" ? (
                                                                                        1 / 10
                                                                                    ) : tokenB.name === 'WISE' && tokenA.name === "WCSPR" ? (
                                                                                        10 / 1
                                                                                    ) : tokenB.name === 'WCSPR' && tokenA.name === "USDC" ? (
                                                                                        8 / 1
                                                                                    ) : tokenB.name === 'USDC' && tokenA.name === "WCSPR" ? (
                                                                                        1 / 8
                                                                                    ) : (
                                                                                        1
                                                                                    )}
                                                                                </Typography>
                                                                                <Typography variant="body1" component="p">
                                                                                    <strong> {tokenB.name} per {tokenA.name} </strong>
                                                                                </Typography>
                                                                            </Col>
                                                                            <Col>
                                                                                <Typography variant="body1" component="p">
                                                                                    0%
                                                                                </Typography>
                                                                                <Typography variant="body1" component="p">
                                                                                    <strong>Share of Pool</strong>

                                                                                </Typography>
                                                                            </Col>
                                                                        </Row>
                                                                    </>
                                                                ) : (
                                                                    null
                                                                )}
                                                                <div className="text-center">
                                                                    <p style={{ color: "red" }}>{msg}</p>
                                                                </div>

                                                                {isLoading ? (
                                                                    <div className="text-center">
                                                                        <Spinner
                                                                            animation="border"
                                                                            role="status"
                                                                            style={{ color: "#ff0000" }}
                                                                        >
                                                                            <span className="sr-only">Loading...</span>
                                                                        </Spinner>
                                                                    </div>
                                                                ) : (
                                                                    tokenANumber !== 0 && tokenBNumber !== 0 && tokenANumber !== undefined && tokenBNumber !== undefined ? (
                                                                        <button
                                                                            className="btn btn-block btn-lg login-btn"
                                                                            type="submit"
                                                                            style={{ marginTop: '20px' }}
                                                                        >
                                                                            Add Liquidity
                                                                        </button>
                                                                    ) : localStorage.getItem("Address") === 'null' || localStorage.getItem("Address") === null || localStorage.getItem("Address") === undefined ? (
                                                                        <button
                                                                            className="btn btn-block btn-lg "
                                                                            disabled
                                                                            style={{ marginTop: '20px' }}
                                                                        >
                                                                            Connect to Casper Signer
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            className="btn btn-block btn-lg "
                                                                            disabled
                                                                            style={{ marginTop: '20px' }}
                                                                        >
                                                                            Enter an Amount
                                                                        </button>
                                                                    )

                                                                )}
                                                            </form>
                                                        </>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div >
    );
}

export default windowSize(Pool);