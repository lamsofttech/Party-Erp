// src/App.tsx
import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { config } from './config';
import { useUser } from './contexts/UserContext';

function App() {
  // const { user, setUser } = useUser();
  // const [loading, setLoading] = useState(true);
  // const navigate = useNavigate();

  // useEffect(() => {
  //   axios
  //     .get('https://finkapinternational.qhtestingserver.com/login/login_credentials_api.php', {
  //       withCredentials: true,
  //     })
  //     .then(response => {
  //       // console.log('API Response:', response.data);
  //       const data = response.data;
  //       if (data.authenticated && data.user) {
  //         setUser(data.user);
  //       } else {
  //         window.location.href = config.loginUrl; // Redirect to login
  //       }
  //     })
  //     .catch(error => {
  //       console.error('API Error:', error);
  //       window.location.href = config.loginUrl;
  //     })
  //     .finally(() => {
  //       setLoading(false);
  //     });
  // }, [navigate, setUser]);

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  // if (!user) {
  //   return null; // Redirect handles this
  // }

  return (
    <main>
      <div>
        <Outlet />
      </div>
    </main>
  );
}

export default App;