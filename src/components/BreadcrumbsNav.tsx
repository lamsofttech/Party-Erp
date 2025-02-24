import { Breadcrumbs, Link, Typography } from "@mui/material";
import { useLocation, Link as RouterLink } from "react-router-dom";

const BreadcrumbsNav = () => {
    const location = useLocation();

    // Split pathname into breadcrumb segments
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <Breadcrumbs aria-label="breadcrumb" separator=">" className="text-gray-600">
            {/* Home Breadcrumb */}
            <Link
                component={RouterLink}
                to="/"
                underline="hover"
                className="text-blue-600 font-medium"
            >
                Home
            </Link>

            {/* Dynamic Breadcrumbs */}
            {pathnames.map((value, index) => {
                // Create full path for each breadcrumb
                const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                const isLast = index === pathnames.length - 1;

                return isLast ? (
                    // Active breadcrumb (last item)
                    <Typography key={to} color="textPrimary" className="font-semibold">
                        {decodeURIComponent(value)}
                    </Typography>
                ) : (
                    // Clickable breadcrumb links
                    <Link
                        key={to}
                        component={RouterLink}
                        to={to}
                        underline="hover"
                        className="text-blue-600 font-medium"
                    >
                        {decodeURIComponent(value)}
                    </Link>
                );
            })}
        </Breadcrumbs>
    );
};

export default BreadcrumbsNav;
