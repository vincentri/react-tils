// crashes on server: there is no location there
export default function Solution() {
  return <p>{location.hash === '#billing' ? 'Billing' : 'Profile'}</p>
}
