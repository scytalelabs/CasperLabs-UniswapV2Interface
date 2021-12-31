import { Avatar, CardHeader } from '@material-ui/core/';
import Card from '@material-ui/core/Card';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import axios from "axios";
import Cookies from "js-cookie";
import React, { useEffect, useState } from "react";
import { Col, Row } from 'react-bootstrap';
import Spinner from "react-bootstrap/Spinner";
import Typography from '@material-ui/core/Typography';

import windowSize from "react-window-size";
import "../../../assets/css/bootstrap.min.css";
import "../../../assets/css/style.css";
import "../../../assets/plugins/fontawesome/css/all.min.css";
import "../../../assets/plugins/fontawesome/css/fontawesome.min.css";
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
    avatar: {
        marginLeft: 40,
    },
}));
function Tokens(props) {
    const classes = useStyles();
    const theme = useTheme();
    let [userName, setUserName] = useState();
    let [priceInUSD, setPriceInUSD] = useState();
    let [tokenA, setTokenA] = useState();
    let [tokenB, setTokenB] = useState();
    let [tokenANumber, setTokenANumber] = useState();
    let [tokenBNumber, setTokenBNumber] = useState();
    const [tokenList, setTokenList] = useState([])
    const [istokenList, setIsTokenList] = useState(false)
    let [isLoading, setIsLoading] = useState(false);
    let [msg, setMsg] = useState("");


    let handleSubmitEvent = (event) => {
        setMsg("");
        setIsLoading(true);
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
                setPriceInUSD(response.data.worth.USD);
            })
            .catch((error) => {
                console.log("response", error.response);
            });
    }, []);
    function shortenAddress(address, chars = 15) {
        return `${address.substring(0, chars + 2)}...${address.substring(64 - chars)}`
    }
    return (

        <div className="account-page">
            <div className="main-wrapper">
                <div className="home-section home-full-height">
                    <HeaderHome selectedNav={"Tokens"} />
                    <div className="card">
                        <div className="container-fluid">
                            <div
                                className="content"
                                style={{ paddingTop: "180px", height: "150vh" }}
                                position="absolute"
                            >
                                <div className="card">
                                    <Typography style={{ marginLeft: '15px', marginTop: '15px' }} variant="h5" color="textSecondary" component="p"><strong>List of Tokens </strong>
                                    </Typography>
                                    <div className="container-fluid">

                                        <div
                                            className="row"
                                            style={{ height: `${props.windowHeight}`, marginRight: "px" }}
                                        >

                                            <div
                                                className="table-responsive"
                                                style={{ paddingTop: "20px" }}
                                            >
                                                <table className="table table-hover table-center mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th style={{ textAlign: 'center' }}>Logo</th>
                                                            <th>Name</th>
                                                            <th>Symbol</th>
                                                            <th>Contract Hash</th>
                                                            <th>Package Hash</th>

                                                        </tr>
                                                    </thead>
                                                    <tbody style={{ color: 'black' }}>
                                                        {tokenList.map((i, index) => (
                                                            <tr key={index}>
                                                                <td>{index + 1}</td>
                                                                <td >
                                                                    <CardHeader 
                                                                        avatar={<Avatar src={i.logoURI} aria-label="Artist" className={classes.avatar} />}
                                                                    />
                                                                </td>
                                                                <td>{i.name}</td>
                                                                <td>{i.symbol}</td>
                                                                <td>{shortenAddress(i.address)}</td>
                                                                <td>{shortenAddress(i.packageHash)}</td>

                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer position={"relative"} />
            </div>


        </div >
    );
}

export default windowSize(Tokens);