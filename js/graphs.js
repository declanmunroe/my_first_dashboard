queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);

function makeGraphs(error, salaryData) {

    var ndx = crossfilter(salaryData);
    
    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]); // same as below
        d.yrs_service = parseInt(d["yrs.service"]); //creating a cleaner variable for the value "yrs.service" in the csv file and also turning it into an int at the same time
    })
    
    change_gender(ndx);
    show_gender_balance(ndx);
    show_average_salary(ndx);
    display_rank(ndx);
    show_percent_that_are_professors(ndx, "Male", "#percent-of-men-professors")
    show_percent_that_are_professors(ndx, "Female", "#percent-of-women-professors")
    show_percent_that_are_asstprofessors(ndx, "Male", "#percent-of-men-asstprofessors")
    show_percent_that_are_asstprofessors(ndx, "Female", "#percent-of-women-asstprofessors")
    show_percent_that_are_asociateprofessors(ndx, "Male", "#percent-of-men-asociateprofessors")
    show_percent_that_are_asociateprofessors(ndx, "Female", "#percent-of-women-asociateprofessors")
    dc.renderAll();
}

function change_gender(ndx, dim) {
    var show_gender = ndx.dimension(dc.pluck("gender"));
    var select_gender = show_gender.group();
    
    dc.selectMenu("#change_gender")
        .dimension(show_gender)
        .group(select_gender);
}
    
    
function show_gender_balance(ndx) {
    
    var gender_dim = ndx.dimension(dc.pluck('gender'));
    var count_by_gender = gender_dim.group();
    
    dc.barChart("#gender_balance")
        .height(300)
        .width(400)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(gender_dim)
        .group(count_by_gender)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Person")
        .yAxis().ticks(4);            
}

function show_average_salary(ndx) {
    
    var gender_dim = ndx.dimension(dc.pluck('gender'));
    var average_salary_by_gender = gender_dim.group().reduce(function(p, v) { // the reduce function takes in two arguments and these need to relate to the incriment of the data and the data file for the second argument. The reduce function needs 3 function aswell to work. These are the rules set out by the dc framework.
        p.count++;
        p.total += v.salary;
        return p;
    },
    function(p, v) { // this is the minus function and is in place for when i select lets say the female value to see the average it will subtract all the male values from the equation
        p.count--;
        if (p.count == 0) {
            p.total = 0;
        }
        else {
            p.total -= v.salary;
        }
        return p;
    },
    function() {
        return {count: 0, total: 0};
    });
    
    dc.barChart("#average_salary")
        .height(300)
        .width(400)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(gender_dim)
        .group(average_salary_by_gender)
        .valueAccessor(function(d) {
            if (d.value.count == 0) {
                return 0;
            }
            else {
                return d.value.total / d.value.count;
            }
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Person")
        .yAxis().ticks(4);            
}

function display_rank(ndx) {
    
    var rank_title = ndx.dimension(dc.pluck('rank'));
    var total_people = rank_title.group();
    
    dc.barChart("#display_rank")
        .height(300)
        .width(400)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(rank_title)
        .group(total_people)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Rank")
        .yAxis().ticks(4);            
}

function show_service_to_salary_correlation(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);

    var eDim = ndx.dimension(dc.pluck("yrs_service"));
    var experienceDim = ndx.dimension(function(d){
        return [d.yrs_service, d.salary, d.rank, d.sex]; // created a fake dimension to store multipe values and all their related information
    });
    var experienceSalaryGroup = experienceDim.group(); // creates a seperate dimension just for creating the min and the max value for salary

    var minExperience = eDim.bottom(1)[0].yrs_service; // bottom(1)[0].yrs service still to be explained
    var maxExperience = eDim.top(1)[0].yrs_service;

    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience,maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Of Service")
        .title(function (d) {
            return d.key[2] + " earned " + d.key[1]; // d.key[2] and d.key[3] relates to return [d.yrs_service, d.salary, d.rank, d.sex]; in the function above
        })
        .colorAccessor(function (d) {
            return d.key[3]; //tells what to use in relation to the color eg value is gender which will decide the colour as coded at the top of the function
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}

function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        function (p, v) {
            if (v.gender === gender) {
                p.count++;
                if (v.rank === "Prof") {
                   p.are_prof++;
                }
            }
            return p;
        },
        function (p, v) {
            if (v.gender === gender) {
                p.count--;
                if (v.rank === "Prof") {
                   p.are_prof--;
                }
            }
            return p;
        },
        function () {
            return {count: 0, are_prof: 0};
        }
    );

    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProf);
}

function show_percent_that_are_asstprofessors(ndx, gender, element) {
    var percentageThatAreAsstProf = ndx.groupAll().reduce(
        function (p, v) {
            if (v.gender === gender) {
                p.count++;
                if (v.rank === "AsstProf") {
                   p.are_prof++;
                }
            }
            return p;
        },
        function (p, v) {
            if (v.gender === gender) {
                p.count--;
                if (v.rank === "AsstProf") {
                   p.are_prof--;
                }
            }
            return p;
        },
        function () {
            return {count: 0, are_prof: 0};
        }
    );

    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreAsstProf);
}

function show_percent_that_are_asociateprofessors(ndx, gender, element) {
    var percentageThatAreAsociateProf = ndx.groupAll().reduce(
        function (p, v) {
            if (v.gender === gender) {
                p.count++;
                if (v.rank === "AssocProf") {
                   p.are_prof++;
                }
            }
            return p;
        },
        function (p, v) {
            if (v.gender === gender) {
                p.count--;
                if (v.rank === "AssocProf") {
                   p.are_prof--;
                }
            }
            return p;
        },
        function () {
            return {count: 0, are_prof: 0};
        }
    );

    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreAsociateProf);
}



