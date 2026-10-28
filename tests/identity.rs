use std::sync::{Arc,atomic::{AtomicUsize,Ordering}};
use tokio::net::UdpSocket;
use zectrix_sdk::{Device,Error,OpenOptions};

#[tokio::test]
async fn pinned_identity_is_checked_before_connect() {
    let socket=Arc::new(UdpSocket::bind("127.0.0.1:0").await.unwrap());
    let address=socket.local_addr().unwrap().to_string();
    let connects=Arc::new(AtomicUsize::new(0));
    let server_socket=socket.clone();let received_connects=connects.clone();
    let server=tokio::spawn(async move {
        let mut bytes=[0u8;1201];
        loop {
            let Ok((len,from))=server_socket.recv_from(&mut bytes).await else {continue;};
            if len<16||bytes[3]&128!=0 {continue;}
            let kind=bytes[3];let mut body=vec![0];
            if kind==1 {
                body.extend([0,12]);body.extend(b"aabbccddeeff");body.push(4);body.extend(b"test");
                body.extend([1,144,1,44,0,0,0,0,0,0,0,0]);
            }else if kind==2 {received_connects.fetch_add(1,Ordering::SeqCst);}
            else if kind==16 {body.extend([0,85,170,255]);body.extend((0u8..16).map(|v|v*17));}
            let mut response=vec![b'Z',b'L',1,kind|128];
            response.extend(0x1122334455667788u64.to_be_bytes());response.extend(&bytes[12..16]);response.extend(body);
            let _=server_socket.send_to(&response,from).await;
        }
    });
    let options=||OpenOptions{target:Some(address.clone()),client_name:Some("identity test".into())};
    let rejected=Device::open_verified(options(),Some("112233445566")).await;
    assert!(matches!(rejected,Err(Error::InvalidOptions(_))));
    assert_eq!(connects.load(Ordering::SeqCst),0,"mismatched ID must not acquire ownership");
    let device=Device::open_verified(options(),Some("aabbccddeeff")).await.unwrap();
    assert_eq!(connects.load(Ordering::SeqCst),1);device.close().await.unwrap();server.abort();
}
